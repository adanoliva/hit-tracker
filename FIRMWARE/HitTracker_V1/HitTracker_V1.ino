/*
 * HIT TRACKER — Firmware V1
 * Hardware: ESP32 + GY-521 (MPU-6050)
 * Comunicación: BLE (streaming en tiempo real)
 *
 * Librerías requeridas (Arduino Library Manager):
 *   - Adafruit MPU6050  (by Adafruit)
 *   - Adafruit Unified Sensor (dependencia de la anterior)
 *   - ESP32 BLE Arduino (incluida en el board package esp32)
 *
 * Board: ESP32 Dev Module
 * Upload speed: 921600
 * Serial monitor: 115200 baud
 */

#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <math.h>

// ── Identidad del sensor ───────────────────────────────────────────────────
// Editar antes de flashear.
#define DEVICE_NAME    "HIT_TRACKER_PROTOTIPO"  // máx 20 caracteres, sin espacios
#define BLE_PIN        "0000"               // mínimo 4 dígitos numéricos
#define SENSOR_VERSION 1

// ── Pines ──────────────────────────────────────────────────────────────────
#define SDA_PIN 21
#define SCL_PIN 22

// ── UUIDs BLE (fijos para todas las versiones) ─────────────────────────────
#define SERVICE_UUID                "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID         "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define VERSION_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// ── Configuración de muestreo ──────────────────────────────────────────────
const uint16_t INTERVAL_MS       = 10;   // 100 Hz
const float    MOVEMENT_THRESHOLD = 0.5; // delta mínimo de magnitud para notificar

// ── Estado BLE ─────────────────────────────────────────────────────────────
BLEServer*         pServer         = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool               deviceConnected = false;

struct SensorReading {
  uint32_t timestamp;
  float ax, ay, az;
  float gx, gy, gz;
};

Adafruit_MPU6050 mpu;

// ── Callbacks BLE ──────────────────────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Cliente BLE conectado");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Cliente BLE desconectado — reiniciando advertising");
    BLEDevice::startAdvertising();
  }
};

// ── BLE ────────────────────────────────────────────────────────────────────
void initBLE() {
  BLEDevice::init(DEVICE_NAME);

  // ponytail: PIN BLE desactivado en prototipo — reactivar en V2 con hardware definitivo

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic* pVersionChar = pService->createCharacteristic(
    VERSION_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  uint8_t version = SENSOR_VERSION;
  pVersionChar->setValue(&version, 1);

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();

  Serial.println("BLE listo — esperando conexión...");
}

void sendViaBLE(const SensorReading& r) {
  uint8_t buffer[28];
  memcpy(&buffer[0],  &r.timestamp, 4);
  memcpy(&buffer[4],  &r.ax,        4);
  memcpy(&buffer[8],  &r.ay,        4);
  memcpy(&buffer[12], &r.az,        4);
  memcpy(&buffer[16], &r.gx,        4);
  memcpy(&buffer[20], &r.gy,        4);
  memcpy(&buffer[24], &r.gz,        4);
  pCharacteristic->setValue(buffer, 28);
  pCharacteristic->notify();
}

// ── Setup ──────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(100);

  Wire.begin(SDA_PIN, SCL_PIN);

  if (!mpu.begin()) {
    Serial.println("ERROR: MPU6050 no encontrado. Verifica conexión I2C.");
    while (1) delay(1000);
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_94_HZ);
  Serial.println("MPU6050 OK");

  initBLE();
  Serial.println("Setup completo.");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  static uint32_t lastReadTime  = 0;
  static float    lastMagnitude = 9.8f;

  uint32_t now = millis();
  if (now - lastReadTime < INTERVAL_MS) {
    delay(1);
    return;
  }
  lastReadTime = now;

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  float magnitude = sqrtf(
    a.acceleration.x * a.acceleration.x +
    a.acceleration.y * a.acceleration.y +
    a.acceleration.z * a.acceleration.z
  );

  // Debug serie (comentar en producción para reducir overhead)
  Serial.print("mag="); Serial.print(magnitude, 2);
  Serial.print("  ax="); Serial.print(a.acceleration.x, 2);
  Serial.print("  ay="); Serial.print(a.acceleration.y, 2);
  Serial.print("  az="); Serial.println(a.acceleration.z, 2);

  if (deviceConnected && fabsf(magnitude - lastMagnitude) > MOVEMENT_THRESHOLD) {
    SensorReading reading = {
      now,
      a.acceleration.x, a.acceleration.y, a.acceleration.z,
      g.gyro.x,         g.gyro.y,         g.gyro.z
    };
    sendViaBLE(reading);
  }

  lastMagnitude = magnitude;
}
