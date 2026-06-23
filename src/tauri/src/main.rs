#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Manager, Peripheral};
use tauri::Emitter;
use serde_json::Value;
use tauri::{AppHandle, Manager as TauriManager, State};
use tokio::time;
use tokio_stream::StreamExt;
use uuid::Uuid;

// Service / characteristic UUIDs matching the firmware
const SERVICE_UUID: &str = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID: &str = "beb5483e-36e1-4688-b7f5-ea07361b26a8";
const VERSION_CHARACTERISTIC_UUID: &str = "beb5483e-36e1-4688-b7f5-ea07361b26a9";

struct BleState {
    scanning: Arc<AtomicBool>,
    // peripherals found during last scan, keyed by device id string
    found: Arc<Mutex<HashMap<String, Peripheral>>>,
    connected: Arc<Mutex<Option<Peripheral>>>,
    reading: Arc<AtomicBool>,
    sensor_version: Arc<Mutex<u8>>,
}

// ── Paths ────────────────────────────────────────────────────────────────────

fn data_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("HitTracker")
}

fn trainings_dir(app: &AppHandle) -> PathBuf {
    data_dir(app).join("trainings")
}

fn ensure_dirs(app: &AppHandle) -> Result<(), String> {
    fs::create_dir_all(trainings_dir(app)).map_err(|e| e.to_string())
}

// ── Migration: rpm → hpm ─────────────────────────────────────────────────────

fn migrate_training(mut t: Value) -> Value {
    if let Some(rounds) = t.get_mut("rounds").and_then(|r| r.as_array_mut()) {
        for round in rounds.iter_mut() {
            if let Some(stats) = round.get_mut("stats") {
                if stats.get("hpmAverage").is_none() {
                    let avg = stats.get("rpmAverage").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let max = stats.get("rpmMax").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    stats["hpmAverage"] = Value::from(avg);
                    stats["hpmMax"] = Value::from(max);
                }
            }
        }
    }
    if t.get("hpmAverage").is_none() {
        let avg = t.get("rpmAverage").and_then(|v| v.as_f64()).unwrap_or(0.0);
        t["hpmAverage"] = Value::from(avg);
    }
    t
}

// ── Storage helpers ───────────────────────────────────────────────────────────

fn read_json(path: &PathBuf, default: Value) -> Value {
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(default)
}

fn write_json(path: &PathBuf, value: &Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(
        path,
        serde_json::to_string_pretty(value).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}

// ── Training commands ─────────────────────────────────────────────────────────

#[tauri::command]
async fn save_training(app: AppHandle, training: Value) -> Result<bool, String> {
    ensure_dirs(&app)?;
    let id = training["id"].as_str().ok_or("Missing id")?;
    let path = trainings_dir(&app).join(format!("{}.json", id));
    write_json(&path, &training)?;
    Ok(true)
}

#[tauri::command]
async fn load_trainings(app: AppHandle) -> Result<Vec<Value>, String> {
    ensure_dirs(&app)?;
    let dir = trainings_dir(&app);
    let mut trainings: Vec<Value> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
        .filter_map(|e| fs::read_to_string(e.path()).ok())
        .filter_map(|s| serde_json::from_str::<Value>(&s).ok())
        .map(migrate_training)
        .collect();
    trainings.sort_by(|a, b| {
        let ta = a["createdAt"].as_f64().unwrap_or(0.0);
        let tb = b["createdAt"].as_f64().unwrap_or(0.0);
        tb.partial_cmp(&ta).unwrap_or(std::cmp::Ordering::Equal)
    });
    Ok(trainings)
}

#[tauri::command]
async fn delete_training(app: AppHandle, id: String) -> Result<bool, String> {
    let path = trainings_dir(&app).join(format!("{}.json", id));
    fs::remove_file(path).map_err(|e| e.to_string())?;
    Ok(true)
}

// ── Device commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn load_devices(app: AppHandle) -> Result<Value, String> {
    ensure_dirs(&app)?;
    Ok(read_json(&data_dir(&app).join("devices.json"), Value::Array(vec![])))
}

#[tauri::command]
async fn save_devices(app: AppHandle, devices: Value) -> Result<bool, String> {
    write_json(&data_dir(&app).join("devices.json"), &devices)?;
    Ok(true)
}

// ── Profile commands ──────────────────────────────────────────────────────────

#[tauri::command]
async fn load_profiles(app: AppHandle) -> Result<Value, String> {
    ensure_dirs(&app)?;
    Ok(read_json(&data_dir(&app).join("profiles.json"), Value::Array(vec![])))
}

#[tauri::command]
async fn save_profiles(app: AppHandle, profiles: Value) -> Result<bool, String> {
    write_json(&data_dir(&app).join("profiles.json"), &profiles)?;
    Ok(true)
}

// ── Config commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn load_config(app: AppHandle) -> Result<Value, String> {
    ensure_dirs(&app)?;
    Ok(read_json(
        &data_dir(&app).join("app-config.json"),
        serde_json::json!({ "theme": "dark" }),
    ))
}

#[tauri::command]
async fn save_config(app: AppHandle, config: Value) -> Result<bool, String> {
    write_json(&data_dir(&app).join("app-config.json"), &config)?;
    Ok(true)
}

// ── BLE commands ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn start_ble_scan(app: AppHandle, state: State<'_, BleState>) -> Result<(), String> {
    if state.scanning.swap(true, Ordering::SeqCst) {
        return Ok(()); // already scanning
    }

    state.found.lock().unwrap().clear();

    let scanning = state.scanning.clone();
    let found = state.found.clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        let result = run_ble_scan(app_handle.clone(), scanning.clone(), found).await;
        scanning.store(false, Ordering::SeqCst);
        if let Err(e) = result {
            let _ = app_handle.emit("ble-scan-error", e);
        }
    });

    Ok(())
}

async fn run_ble_scan(
    app: AppHandle,
    scanning: Arc<AtomicBool>,
    found: Arc<Mutex<HashMap<String, Peripheral>>>,
) -> Result<(), String> {
    let manager = Manager::new().await.map_err(|e| e.to_string())?;
    let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
    let adapter = adapters
        .into_iter()
        .next()
        .ok_or("No Bluetooth adapter found")?;

    let svc_uuid = Uuid::parse_str(SERVICE_UUID).map_err(|e| e.to_string())?;
    adapter
        .start_scan(ScanFilter { services: vec![svc_uuid] })
        .await
        .map_err(|e| e.to_string())?;

    while scanning.load(Ordering::SeqCst) {
        time::sleep(Duration::from_millis(500)).await;

        if let Ok(peripherals) = adapter.peripherals().await {
            // resolve names async first (no lock held across await)
            let mut entries: Vec<(String, String, Peripheral)> = vec![];
            for p in peripherals {
                let id = p.id().to_string();
                let name = match p.properties().await {
                    Ok(Some(props)) => props.local_name.unwrap_or_else(|| id.clone()),
                    _ => id.clone(),
                };
                entries.push((id, name, p));
            }
            let mut devices = vec![];
            let mut map = found.lock().unwrap();
            for (id, name, p) in entries {
                map.insert(id.clone(), p);
                devices.push(serde_json::json!({ "deviceId": id, "deviceName": name }));
            }
            let _ = app.emit("ble-devices-updated", devices);
        }
    }

    let _ = adapter.stop_scan().await;
    Ok(())
}

#[tauri::command]
async fn cancel_ble_scan(state: State<'_, BleState>) -> Result<(), String> {
    state.scanning.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn connect_ble_device(
    app: AppHandle,
    state: State<'_, BleState>,
    device_id: String,
) -> Result<(), String> {
    state.scanning.store(false, Ordering::SeqCst);

    // Use cached peripheral from last scan, or do a quick scan to find it
    let cached = state.found.lock().unwrap().get(&device_id).cloned();
    let peripheral = if let Some(p) = cached {
        p
    } else {
        let manager = Manager::new().await.map_err(|e| e.to_string())?;
        let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
        let adapter = adapters.into_iter().next().ok_or("No Bluetooth adapter")?;
        let svc_uuid = Uuid::parse_str(SERVICE_UUID).map_err(|e| e.to_string())?;
        adapter.start_scan(ScanFilter { services: vec![svc_uuid] }).await.map_err(|e| e.to_string())?;
        time::sleep(Duration::from_secs(3)).await;
        let _ = adapter.stop_scan().await;
        adapter.peripherals().await.map_err(|e| e.to_string())?
            .into_iter()
            .find(|p| p.id().to_string() == device_id)
            .ok_or("Device not found — make sure the sensor is on")?
    };

    peripheral.connect().await.map_err(|e| e.to_string())?;
    peripheral.discover_services().await.map_err(|e| e.to_string())?;

    let svc_uuid = Uuid::parse_str(SERVICE_UUID).map_err(|e| e.to_string())?;
    let chr_uuid = Uuid::parse_str(CHARACTERISTIC_UUID).map_err(|e| e.to_string())?;
    let ver_uuid = Uuid::parse_str(VERSION_CHARACTERISTIC_UUID).map_err(|e| e.to_string())?;

    let service = peripheral
        .services()
        .iter()
        .find(|s| s.uuid == svc_uuid)
        .ok_or("HIT TRACKER service not found")?
        .clone();

    let characteristic = service
        .characteristics
        .iter()
        .find(|c| c.uuid == chr_uuid)
        .ok_or("Sensor characteristic not found")?
        .clone();

    // Read sensor version (default 1 if characteristic absent)
    let version: u8 = if let Some(ver_char) = service.characteristics.iter().find(|c| c.uuid == ver_uuid) {
        peripheral.read(ver_char).await.ok().and_then(|b| b.first().copied()).unwrap_or(1)
    } else {
        1
    };
    *state.sensor_version.lock().unwrap() = version;

    peripheral.subscribe(&characteristic).await.map_err(|e| e.to_string())?;

    // notifications() must be called AFTER subscribe on some backends
    let stream_result = peripheral.notifications().await;

    *state.connected.lock().unwrap() = Some(peripheral.clone());
    state.reading.store(true, Ordering::SeqCst);

    let reading_flag = state.reading.clone();
    tokio::spawn(async move {
        let mut stream = match stream_result {
            Ok(s) => s,
            Err(e) => {
                let _ = app.emit("ble-sensor-error", e.to_string());
                return;
            }
        };
        while reading_flag.load(Ordering::SeqCst) {
            match tokio::time::timeout(Duration::from_secs(5), stream.next()).await {
                Ok(Some(data)) => {
                    if version == 2 && data.value.len() == 16 {
                        let ax = i16::from_le_bytes(data.value[4..6].try_into().unwrap()) as f64;
                        let ay = i16::from_le_bytes(data.value[6..8].try_into().unwrap()) as f64;
                        let az = i16::from_le_bytes(data.value[8..10].try_into().unwrap()) as f64;
                        let _ = app.emit("ble-sensor-data", serde_json::json!({ "ax": ax, "ay": ay, "az": az }));
                    } else if version != 2 && data.value.len() == 28 {
                        let ax = f32::from_le_bytes(data.value[4..8].try_into().unwrap());
                        let ay = f32::from_le_bytes(data.value[8..12].try_into().unwrap());
                        let az = f32::from_le_bytes(data.value[12..16].try_into().unwrap());
                        let _ = app.emit("ble-sensor-data", serde_json::json!({ "ax": ax, "ay": ay, "az": az }));
                    }
                }
                Ok(None) => break,
                Err(_) => {} // timeout — keep waiting
            }
        }
        let _ = peripheral.disconnect().await;
    });

    Ok(())
}

#[tauri::command]
async fn disconnect_ble_device(state: State<'_, BleState>) -> Result<(), String> {
    state.reading.store(false, Ordering::SeqCst);
    let peripheral = state.connected.lock().unwrap().take();
    if let Some(p) = peripheral {
        let _ = p.disconnect().await;
    }
    Ok(())
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BleState {
            scanning: Arc::new(AtomicBool::new(false)),
            found: Arc::new(Mutex::new(HashMap::new())),
            connected: Arc::new(Mutex::new(None)),
            reading: Arc::new(AtomicBool::new(false)),
            sensor_version: Arc::new(Mutex::new(1)),
        })
        .invoke_handler(tauri::generate_handler![
            save_training,
            load_trainings,
            delete_training,
            save_devices,
            load_devices,
            save_profiles,
            load_profiles,
            save_config,
            load_config,
            start_ble_scan,
            cancel_ble_scan,
            connect_ble_device,
            disconnect_ble_device,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
