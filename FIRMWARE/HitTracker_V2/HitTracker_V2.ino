/*
 * HIT TRACKER — Firmware V2
 * Hardware: ESP32 + GY-521 (MPU-6050)
 * Comunicación: BLE (streaming en tiempo real)
 *
 * Cambio respecto a V1: envía valores raw int16 divididos por 16
 * en lugar de floats en m/s². Packet de 16 bytes en vez de 28.
 * Esto produce magnitudes en rango ~128 (reposo) a 1500+ (golpe fuerte).
 *
 * Librerías requeridas (Arduino Library Manager):
 *   - MPU6050  (by Electronic Cats — "MPU6050 by Electronic Cats")
 *   - I2Cdev   (incluida con la anterior, o instalar de jrowberg/i2cdevlib)
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
#include <math.h>

// ── Identidad del sensor ───────────────────────────────────────────────────
// Editar antes de flashear.
#define DEVICE_NAME    "HT-PROT"  // máx 20 caracteres, sin espacios
#define SENSOR_VERSION 2

// ── Pines ──────────────────────────────────────────────────────────────────
#define SDA_PIN 21
#define SCL_PIN 22

// ── UUIDs BLE (fijos para todas las versiones) ─────────────────────────────
#define SERVICE_UUID                "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID         "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define VERSION_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// ── Configuración de muestreo ──────────────────────────────────────────────
const uint16_t INTERVAL_MS        = 10;  // 100 Hz
const float    MOVEMENT_THRESHOLD = 5.0f; // delta mínimo de magnitude (raw/16) para notificar

// ── Estado BLE ─────────────────────────────────────────────────────────────
BLEServer*         pServer         = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool               deviceConnected = false;

MPU6050 mpu;

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
  pAdvertising->setScanResponse(true);  // nombre completo en scan response packet
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("BLE listo — esperando conexión...");
}

void sendViaBLE(uint32_t timestamp, int16_t ax, int16_t ay, int16_t az,
                int16_t gx, int16_t gy, int16_t gz) {
  uint8_t buffer[16];
  memcpy(&buffer[0],  &timestamp, 4);
  memcpy(&buffer[4],  &ax, 2);
  memcpy(&buffer[6],  &ay, 2);
  memcpy(&buffer[8],  &az, 2);
  memcpy(&buffer[10], &gx, 2);
  memcpy(&buffer[12], &gy, 2);
  memcpy(&buffer[14], &gz, 2);
  pCharacteristic->setValue(buffer, 16);
  pCharacteristic->notify();
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

  // ±16g, ±2000°/s — rango máximo para capturar golpes fuertes
  mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_16);
  mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_2000);
  Serial.println("MPU6050 OK");

  initBLE();
  Serial.println("Setup completo. Firmware V2.");
}

// ── Loop ───────────────────────────────────────────────────────────────────
void loop() {
  static uint32_t lastReadTime  = 0;
  static float    lastMagnitude = 128.0f; // reposo ≈ 128 (1g * 2048 / 16)

  uint32_t now = millis();
  if (now - lastReadTime < INTERVAL_MS) {
    delay(1);
    return;
  }
  lastReadTime = now;

  int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
  mpu.getAcceleration(&ax_raw, &ay_raw, &az_raw);
  mpu.getRotation(&gx_raw, &gy_raw, &gz_raw);

  // Escalar dividiendo por 16 — enteros en rango manejable
  int16_t ax = ax_raw / 16;
  int16_t ay = ay_raw / 16;
  int16_t az = az_raw / 16;
  int16_t gx = gx_raw / 16;
  int16_t gy = gy_raw / 16;
  int16_t gz = gz_raw / 16;

  float magnitude = sqrtf((float)ax * ax + (float)ay * ay + (float)az * az);

  Serial.print("mag="); Serial.print(magnitude, 0);
  Serial.print("  ax="); Serial.print(ax);
  Serial.print("  ay="); Serial.print(ay);
  Serial.print("  az="); Serial.println(az);

  if (deviceConnected && fabsf(magnitude - lastMagnitude) > MOVEMENT_THRESHOLD) {
    sendViaBLE(now, ax, ay, az, gx, gy, gz);
  }

  lastMagnitude = magnitude;
}
