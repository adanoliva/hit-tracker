#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::Manager;
use tauri::Emitter;
use serde_json::Value;
use tauri::{AppHandle, Manager as TauriManager, State};
use tokio::time;

struct BleState {
    scanning: Arc<AtomicBool>,
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

    let scanning = state.scanning.clone();
    let app_handle = app.clone();

    tokio::spawn(async move {
        let result = run_ble_scan(app_handle.clone(), scanning.clone()).await;
        scanning.store(false, Ordering::SeqCst);
        if let Err(e) = result {
            let _ = app_handle.emit("ble-scan-error", e);
        }
    });

    Ok(())
}

async fn run_ble_scan(app: AppHandle, scanning: Arc<AtomicBool>) -> Result<(), String> {
    let manager = Manager::new().await.map_err(|e| e.to_string())?;
    let adapters = manager.adapters().await.map_err(|e| e.to_string())?;
    let adapter = adapters
        .into_iter()
        .next()
        .ok_or("No Bluetooth adapter found")?;

    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| e.to_string())?;

    while scanning.load(Ordering::SeqCst) {
        time::sleep(Duration::from_millis(500)).await;

        if let Ok(peripherals) = adapter.peripherals().await {
            let mut devices = vec![];
            for p in peripherals {
                if let Ok(Some(props)) = p.properties().await {
                    devices.push(serde_json::json!({
                        "deviceId": p.id().to_string(),
                        "deviceName": props.local_name.unwrap_or_else(|| "Unknown".to_string())
                    }));
                }
            }
            let _ = app.emit("ble-devices-updated", devices);
        }
    }

    let _ = adapter.stop_scan().await;
    Ok(())
}

#[tauri::command]
async fn select_ble_device(state: State<'_, BleState>) -> Result<(), String> {
    state.scanning.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
async fn cancel_ble_scan(state: State<'_, BleState>) -> Result<(), String> {
    state.scanning.store(false, Ordering::SeqCst);
    Ok(())
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BleState {
            scanning: Arc::new(AtomicBool::new(false)),
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
            select_ble_device,
            cancel_ble_scan,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
