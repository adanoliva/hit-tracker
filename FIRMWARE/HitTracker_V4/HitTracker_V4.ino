/*
 * HIT TRACKER — Firmware V4
 * Hardware: ESP32 + GY-521 (MPU-6050)
 * Comunicación: BLE (eventos de golpe — solo notifica cuando detecta un impacto)
 *
 * Cambio respecto a V3:
 *   - Decaimiento del suelo dinámico (dynamicFloor) exponencial en vez de lineal,
 *     derivado de cfgCooldown (mismo criterio que HT-022 en la app: 95% recuperado
 *     transcurrido cfgCooldown ms desde el pico). Antes bajaba a tasa fija de
 *     0.5 raw/ms, ignorando la magnitud del golpe — esto limitaba la detección
 *     de combos rápidos y potentes tras un golpe fuerte.
 *
 * Formato packet NOTIFY (6 bytes):
 *   uint32 timestamp (ms desde boot)
 *   uint16 magnitude (raw: sqrt(ax²+ay²+az²), escala raw/16)
 *
 * Formato packet CONFIG WRITE (4 bytes):
 *   uint16 threshold_raw  — magnitud mínima para contar como golpe (ej. 300)
 *   uint16 cooldown_ms    — tiempo mínimo entre golpes en ms (ej. 400)
 *
 * Librerías requeridas (Arduino Library Manager):
 *   - MPU6050  (by Electronic Cats)
 *   - I2Cdev   (incluida con la anterior)
 *   - ESP32 BLE Arduino (incluida en el board package esp32)
 *
 * Board: ESP32 Dev Module
 * Upload speed: 921600
 * Serial monitor: 115200 baud
 */

#include <Wire.h>
#include <I2Cdev.h>
#include <MPU6050.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Preferences.h>
#include <math.h>

// ── Identidad ──────────────────────────────────────────────────────────────
#define DEVICE_NAME    "HT-PROTV4"
#define SENSOR_VERSION 4

// ── Pines ──────────────────────────────────────────────────────────────────
#define SDA_PIN 21
#define SCL_PIN 22

// ── UUIDs BLE ──────────────────────────────────────────────────────────────
#define SERVICE_UUID         "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define HIT_CHAR_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // NOTIFY — hit events
#define VERSION_CHAR_UUID    "beb5483e-36e1-4688-b7f5-ea07361b26a9"  // READ   — sensor version
#define CONFIG_CHAR_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26aa"  // WRITE  — threshold + cooldown

// ── Configuración de detección (valores por defecto) ──────────────────────
// threshold_raw: magnitud mínima para contar como golpe
//   threshold=30 en perfil → raw=300 (profile.threshold * 10)
// cooldown_ms: tiempo mínimo entre golpes
//   jab suave sensor abajo ≈ 400ms (200 base + 665peak * 0.3 damping)
#define DEFAULT_THRESHOLD 300
#define DEFAULT_COOLDOWN  400

// Decaimiento exponencial del dynamicFloor: 95% recuperado hacia cfgThreshold
// transcurridos cfgCooldown ms desde el pico — mismo criterio que useSensorData.ts (HT-022)
#define FLOOR_RECOVERY_FRACTION 0.05f

// ── Configuración de muestreo ──────────────────────────────────────────────
const uint16_t INTERVAL_MS = 10  ;  // 100 Hz

// ── Estado global ──────────────────────────────────────────────────────────
BLEServer*         pServer    = nullptr;
BLECharacteristic* pHitChar   = nullptr;
bool               deviceConnected = false;

MPU6050   mpu;
Preferences prefs;

uint16_t cfgThreshold = DEFAULT_THRESHOLD;
uint16_t cfgCooldown  = DEFAULT_COOLDOWN;

// ── Detección de golpe ─────────────────────────────────────────────────────
float    lastMagnitude  = 128.0f;
uint32_t lastHitTime    = 0;
float    dynamicFloor   = 0.0f;
uint32_t lastReadTime   = 0;

// ── Persistencia ──────────────────────────────────────────────────────────
void loadConfig() {
  prefs.begin("ht-cfg", true);  // read-only
  cfgThreshold = prefs.getUShort("threshold", DEFAULT_THRESHOLD);
  cfgCooldown  = prefs.getUShort("cooldown",  DEFAULT_COOLDOWN);
  prefs.end();
  Serial.printf("Config cargada: threshold=%u cooldown=%u\n", cfgThreshold, cfgCooldown);
}

void saveConfig() {
  prefs.begin("ht-cfg", false);
  prefs.putUShort("threshold", cfgThreshold);
  prefs.putUShort("cooldown",  cfgCooldown);
  prefs.end();
}

// ── Callbacks BLE ──────────────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*)    { deviceConnected = true;  Serial.println("Cliente BLE conectado"); }
  void onDisconnect(BLEServer*) {
    deviceConnected = false;
    Serial.println("Cliente BLE desconectado — reiniciando advertising");
    BLEDevice::startAdvertising();
  }
};

class ConfigCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) {
    String val = pChar->getValue();
    if (val.length() < 4) return;
    uint16_t th, cd;
    memcpy(&th, val.c_str(),     2);
    memcpy(&cd, val.c_str() + 2, 2);
    cfgThreshold = th;
    cfgCooldown  = cd;
    dynamicFloor = (float)cfgThreshold;  // reset floor to new base
    saveConfig();
    Serial.printf("Config actualizada: threshold=%u cooldown=%u\n", th, cd);
  }
};

// ── BLE ────────────────────────────────────────────────────────────────────
void initBLE() {
  BLEDevice::init(DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Hit event characteristic (NOTIFY)
  pHitChar = pService->createCharacteristic(HIT_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pHitChar->addDescriptor(new BLE2902());

  // Version characteristic (READ)
  BLECharacteristic* pVersionChar = pService->createCharacteristic(VERSION_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  uint8_t version = SENSOR_VERSION;
  pVersionChar->setValue(&version, 1);

  // Config characteristic (WRITE)
  BLECharacteristic* pConfigChar = pService->createCharacteristic(CONFIG_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pConfigChar->setCallbacks(new ConfigCallbacks());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE listo — esperando conexión...");
}

// ── Enviar evento de golpe (6 bytes) ──────────────────────────────────────
void sendHitEvent(uint32_t timestamp, uint16_t magnitude) {
  uint8_t buffer[6];
  memcpy(&buffer[0], &timestamp, 4);
  memcpy(&buffer[4], &magnitude, 2);
  pHitChar->setValue(buffer, 6);
  pHitChar->notify();
  Serial.printf("HIT: mag=%u ts=%u\n", magnitude, timestamp);
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);

  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();

  if (!mpu.testConnection()) {
    Serial.println("ERROR: MPU6050 no encontrado. Verifica conexión I2C.");
    while (1) delay(1000);
  }

  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_16);
  mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_2000);
  Serial.println("MPU6050 OK");

  loadConfig();
  dynamicFloor = (float)cfgThreshold;

  initBLE();
  Serial.println("Setup completo. Firmware V4.");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  uint32_t now = millis();
  if (now - lastReadTime < INTERVAL_MS) {
    delay(1);
    return;
  }
  uint32_t deltaMs = now - lastReadTime;
  lastReadTime = now;

  int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
  mpu.getAcceleration(&ax_raw, &ay_raw, &az_raw);
  mpu.getRotation(&gx_raw, &gy_raw, &gz_raw);

  int16_t ax = ax_raw / 16;
  int16_t ay = ay_raw / 16;
  int16_t az = az_raw / 16;

  float magnitude = sqrtf((float)ax * ax + (float)ay * ay + (float)az * az);

  // Decaimiento exponencial del suelo dinámico hacia cfgThreshold, derivado de
  // cfgCooldown (95% recuperado transcurrido cfgCooldown ms) — mismo criterio
  // que useSensorData.ts (HT-022), en vez de la tasa lineal fija anterior (0.5 raw/ms)
  // que no distinguía golpes fuertes de suaves.
  float lambda = -logf(FLOOR_RECOVERY_FRACTION) / (float)cfgCooldown;
  dynamicFloor = (float)cfgThreshold + (dynamicFloor - (float)cfgThreshold) * expf(-lambda * (float)deltaMs);

  bool isRising = magnitude >= lastMagnitude;

  // Peak detected: signal falling after exceeding dynamic floor + cooldown elapsed
  if (!isRising && lastMagnitude > dynamicFloor && (now - lastHitTime) > cfgCooldown) {
    uint16_t peakMag = (uint16_t)lastMagnitude;
    lastHitTime   = now;
    dynamicFloor  = fmaxf((float)cfgThreshold, lastMagnitude * 0.4f);

    Serial.printf("mag=%.0f floor=%.0f  ← GOLPE\n", lastMagnitude, dynamicFloor);
    if (deviceConnected) sendHitEvent(now, peakMag);
  } else if (magnitude > cfgThreshold * 0.5f) {
    Serial.printf("mag=%.0f floor=%.0f\n", magnitude, dynamicFloor);
  }

  lastMagnitude = magnitude;
}
