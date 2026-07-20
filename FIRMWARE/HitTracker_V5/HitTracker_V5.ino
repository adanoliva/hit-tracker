/*
 * HIT TRACKER — Firmware V5
 * Hardware: ESP32 DevKit V1 + GY-521 (MPU-6050) + TP4056 + LM2596 + 18650
 *
 * Cambios respecto a V3:
 *   - 4 LEDs indicadores (Rojo/Azul/Verde/Amarillo)
 *   - Monitorización de batería 18650 via ADC (GPIO 34 + divisor de voltaje)
 *   - Nueva BLE characteristic READ para nivel de batería (uint8, 0-100 %)
 *
 * Comportamiento de LEDs:
 *   LED Rojo  (GPIO 2):  encendido fijo (power ON)
 *                        doble destello cada 5s si batería ≤ 20 %
 *   LED Azul  (GPIO 4):  apagado sin conexión BLE
 *                        parpadeo 1 Hz con cliente BLE conectado
 *   LED Verde (GPIO 15): reserva — apagado
 *   LED Amarillo (GPIO 13): destello 50 ms en cada golpe detectado
 *
 * ⚠️  NOTA HARDWARE: GPIO 35 en ESP32 DevKit V1 es input-only.
 *     El LED amarillo va en GPIO 13, no en GPIO 35 como figura en GUIA-CONEXION-V1.
 *     Conectar el LED amarillo a GPIO 13 con resistor 220Ω.
 *
 * Divisor de voltaje para batería (soldar en breadboard):
 *   Batería (+) → R1 (100 kΩ) → GPIO 34 → R2 (100 kΩ) → GND
 *   V_bat = V_adc × 2   (divisor 1:1)
 *   18650: 4.2 V = 100 %, 3.5 V = 0 % (margen operativo)
 *
 * Formato BLE:
 *   HIT_CHAR    NOTIFY  6 bytes: {uint32 timestamp_ms, uint16 magnitude}
 *   VERSION_CHAR READ   1 byte:  uint8 = 4
 *   CONFIG_CHAR  WRITE  4 bytes: {uint16 threshold_raw, uint16 cooldown_ms}
 *   BATTERY_CHAR READ   1 byte:  uint8 = 0-100 (%)
 *
 * Librerías (Arduino Library Manager):
 *   - MPU6050  (by Electronic Cats)
 *   - I2Cdev   (incluida con la anterior)
 *   - ESP32 BLE Arduino (incluida en el board package esp32)
 *
 * Board: ESP32 Dev Module | Upload: 921600 | Monitor: 115200
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
#define DEVICE_NAME    "HT-PROT"
#define SENSOR_VERSION 5

// ── Pines I2C ──────────────────────────────────────────────────────────────
#define SDA_PIN 21
#define SCL_PIN 22

// ── Pines LEDs ─────────────────────────────────────────────────────────────
#define LED_RED    2   // Encendido (siempre ON / doble destello si batería baja)
#define LED_BLUE   4   // BLE conectado (parpadeo 1 Hz)
#define LED_GREEN  15  // Reserva
#define LED_HIT    13  // Golpe detectado (destello 50 ms)
//
// ⚠️  GPIO 35 de la guía es input-only. Se usa GPIO 13 en su lugar.

// ── Pin ADC batería ────────────────────────────────────────────────────────
// Divisor: Bat(+) → 100kΩ → GPIO34 → 100kΩ → GND
// V_bat = analogRead(BATT_ADC_PIN) / 4095.0 * 3.3 * 2.0
#define BATT_ADC_PIN 34

// Umbrales de batería (voltaje real de la 18650)
#define BATT_FULL_V   4.2f
#define BATT_LOW_V    3.5f   // 0 % operativo (TP4056 corta antes de 3.0 V)
#define BATT_WARN_PCT 20     // aviso LED por debajo de este porcentaje

// ── UUIDs BLE ──────────────────────────────────────────────────────────────
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define HIT_CHAR_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a8"  // NOTIFY
#define VERSION_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"  // READ
#define CONFIG_CHAR_UUID  "beb5483e-36e1-4688-b7f5-ea07361b26aa"  // WRITE
#define BATTERY_CHAR_UUID "beb5483e-36e1-4688-b7f5-ea07361b26ab"  // READ

// ── Config por defecto ─────────────────────────────────────────────────────
#define DEFAULT_THRESHOLD 300
#define DEFAULT_COOLDOWN  400

// ── Muestreo ───────────────────────────────────────────────────────────────
const uint16_t INTERVAL_MS = 10;  // 100 Hz

// ── Estado global ──────────────────────────────────────────────────────────
BLEServer*         pServer    = nullptr;
BLECharacteristic* pHitChar   = nullptr;
BLECharacteristic* pBattChar  = nullptr;
bool               deviceConnected = false;

MPU6050    mpu;
Preferences prefs;

uint16_t cfgThreshold = DEFAULT_THRESHOLD;
uint16_t cfgCooldown  = DEFAULT_COOLDOWN;

// ── Detección de golpe ─────────────────────────────────────────────────────
float    lastMagnitude = 128.0f;
uint32_t lastHitTime   = 0;
float    dynamicFloor  = 0.0f;
uint32_t lastReadTime  = 0;

// ── LEDs — estado no bloqueante ────────────────────────────────────────────
uint32_t  hitLedOffAt    = 0;   // millis() cuando apagar el LED amarillo
bool      hitLedOn       = false;

uint32_t  blueLastToggle = 0;
bool      blueState      = false;

// Batería baja: doble destello del LED rojo
uint8_t   battPct        = 100;
uint32_t  battLastCheck  = 0;
uint32_t  battLastWarn   = 0;   // último aviso de batería baja
uint8_t   warnBlinkCount = 0;   // 0-3 (2 encendidos + 2 apagados)
uint32_t  warnBlinkAt    = 0;

// ── Batería ────────────────────────────────────────────────────────────────
uint8_t readBatteryPercent() {
  // Promedio de 8 lecturas ADC para reducir ruido
  uint32_t sum = 0;
  for (int i = 0; i < 8; i++) { sum += analogRead(BATT_ADC_PIN); delay(2); }
  float vAdc = (sum / 8.0f) / 4095.0f * 3.3f;
  float vBat = vAdc * 2.0f;  // divisor 1:1
  float pct  = (vBat - BATT_LOW_V) / (BATT_FULL_V - BATT_LOW_V) * 100.0f;
  return (uint8_t)constrain(pct, 0.0f, 100.0f);
}

void updateBattery() {
  battPct = readBatteryPercent();
  Serial.printf("Batería: %u %%\n", battPct);
  // Actualizar BLE characteristic para que la app pueda leerla
  pBattChar->setValue(&battPct, 1);
}

// ── LEDs — utilidades ──────────────────────────────────────────────────────
void ledsInit() {
  pinMode(LED_RED,   OUTPUT);
  pinMode(LED_BLUE,  OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_HIT,   OUTPUT);
  analogSetAttenuation(ADC_11db);  // rango 0-3.9 V para el ADC

  digitalWrite(LED_RED,   HIGH);  // power ON siempre
  digitalWrite(LED_BLUE,  LOW);
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_HIT,   LOW);
}

// Llamar en cada iteración del loop — no bloquea
void ledsUpdate(uint32_t now) {
  // LED Amarillo: apagar cuando toca
  if (hitLedOn && now >= hitLedOffAt) {
    digitalWrite(LED_HIT, LOW);
    hitLedOn = false;
  }

  // LED Azul: parpadeo 1 Hz si conectado, apagado si no
  if (deviceConnected) {
    if (now - blueLastToggle >= 500) {
      blueState = !blueState;
      digitalWrite(LED_BLUE, blueState ? HIGH : LOW);
      blueLastToggle = now;
    }
  } else {
    if (blueState) {
      blueState = false;
      digitalWrite(LED_BLUE, LOW);
    }
  }

  // LED Rojo: doble destello si batería baja, fijo si normal
  if (battPct <= BATT_WARN_PCT) {
    // Inicia secuencia de doble destello cada 5 s
    if (now - battLastWarn >= 5000 && warnBlinkCount == 0) {
      battLastWarn   = now;
      warnBlinkCount = 1;
      warnBlinkAt    = now;
      digitalWrite(LED_RED, LOW);
    }
    // Secuencia: OFF→ON→OFF→ON→OFF→fijo OFF hasta siguiente ciclo
    if (warnBlinkCount > 0 && now >= warnBlinkAt + 120) {
      warnBlinkAt = now;
      warnBlinkCount++;
      // patrón: 1=off, 2=on, 3=off, 4=on, 5=fin→off fijo
      if      (warnBlinkCount == 2) digitalWrite(LED_RED, HIGH);
      else if (warnBlinkCount == 3) digitalWrite(LED_RED, LOW);
      else if (warnBlinkCount == 4) digitalWrite(LED_RED, HIGH);
      else if (warnBlinkCount >= 5) { digitalWrite(LED_RED, LOW); warnBlinkCount = 0; }
    }
  } else {
    // Normal: rojo fijo
    digitalWrite(LED_RED, HIGH);
    warnBlinkCount = 0;
  }
}

void flashHitLed(uint32_t now) {
  digitalWrite(LED_HIT, HIGH);
  hitLedOn    = true;
  hitLedOffAt = now + 50;
}

// ── Persistencia ──────────────────────────────────────────────────────────
void loadConfig() {
  prefs.begin("ht-cfg", true);
  cfgThreshold = prefs.getUShort("threshold", DEFAULT_THRESHOLD);
  cfgCooldown  = prefs.getUShort("cooldown",  DEFAULT_COOLDOWN);
  prefs.end();
  Serial.printf("Config: threshold=%u cooldown=%u\n", cfgThreshold, cfgCooldown);
}

void saveConfig() {
  prefs.begin("ht-cfg", false);
  prefs.putUShort("threshold", cfgThreshold);
  prefs.putUShort("cooldown",  cfgCooldown);
  prefs.end();
}

// ── Callbacks BLE ──────────────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer*) {
    deviceConnected = true;
    Serial.println("Cliente BLE conectado");
  }
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
    dynamicFloor = (float)cfgThreshold;
    saveConfig();
    Serial.printf("Config actualizada: threshold=%u cooldown=%u\n", th, cd);
  }
};

// ── BLE setup ─────────────────────────────────────────────────────────────
void initBLE() {
  BLEDevice::init(DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  // Hit events (NOTIFY)
  pHitChar = pService->createCharacteristic(HIT_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pHitChar->addDescriptor(new BLE2902());

  // Versión del sensor (READ)
  BLECharacteristic* pVersionChar = pService->createCharacteristic(VERSION_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  uint8_t version = SENSOR_VERSION;
  pVersionChar->setValue(&version, 1);

  // Configuración threshold + cooldown (WRITE)
  BLECharacteristic* pConfigChar = pService->createCharacteristic(CONFIG_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pConfigChar->setCallbacks(new ConfigCallbacks());

  // Nivel de batería (READ)
  pBattChar = pService->createCharacteristic(BATTERY_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  uint8_t initPct = 0;
  pBattChar->setValue(&initPct, 1);

  pService->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE listo — esperando conexión...");
}

// ── Enviar evento de golpe (6 bytes) ─────────────────────────────────────
void sendHitEvent(uint32_t timestamp, uint16_t magnitude) {
  uint8_t buffer[6];
  memcpy(&buffer[0], &timestamp, 4);
  memcpy(&buffer[4], &magnitude, 2);
  pHitChar->setValue(buffer, 6);
  pHitChar->notify();
  Serial.printf("HIT: mag=%u ts=%u batt=%u%%\n", magnitude, timestamp, battPct);
}

// ── Setup ─────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);

  ledsInit();

  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("ERROR: MPU6050 no encontrado.");
    // Parpadeo rápido rojo como indicador de error
    for (int i = 0; i < 10; i++) { digitalWrite(LED_RED, LOW); delay(100); digitalWrite(LED_RED, HIGH); delay(100); }
    while (1) delay(1000);
  }
  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_16);
  mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_2000);
  Serial.println("MPU6050 OK");

  loadConfig();
  dynamicFloor = (float)cfgThreshold;

  // Lectura inicial de batería
  updateBattery();

  initBLE();
  Serial.println("Setup completo. Firmware V5.");
}

// ── Loop ──────────────────────────────────────────────────────────────────
void loop() {
  uint32_t now = millis();

  // Actualizar LEDs (no bloqueante)
  ledsUpdate(now);

  // Lectura de batería cada 30 s
  if (now - battLastCheck >= 30000) {
    battLastCheck = now;
    updateBattery();
  }

  // Muestreo MPU-6050 a 100 Hz
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

  // Decaimiento del suelo dinámico hacia cfgThreshold (0.5 raw/ms)
  dynamicFloor = fmaxf((float)cfgThreshold, dynamicFloor - 0.5f * (float)deltaMs);

  bool isRising = magnitude >= lastMagnitude;

  // Detección de pico: señal bajando tras superar el suelo dinámico + cooldown
  if (!isRising && lastMagnitude > dynamicFloor && (now - lastHitTime) > cfgCooldown) {
    uint16_t peakMag = (uint16_t)lastMagnitude;
    lastHitTime  = now;
    dynamicFloor = fmaxf((float)cfgThreshold, lastMagnitude * 0.4f);

    flashHitLed(now);
    Serial.printf("mag=%.0f floor=%.0f  ← GOLPE\n", lastMagnitude, dynamicFloor);
    if (deviceConnected) sendHitEvent(now, peakMag);
  } else if (magnitude > cfgThreshold * 0.5f) {
    Serial.printf("mag=%.0f floor=%.0f\n", magnitude, dynamicFloor);
  }

  lastMagnitude = magnitude;
}
