# Sensor Técnico V2 — ESP32 + MPU-6050

## Descripción

El firmware V2 envía valores de aceleración y giroscopio como `int16` divididos por 16 (raw ADC / 16) en lugar de floats en m/s². Esto produce valores enteros en el rango ~100-1500+ que se corresponden mejor con la percepción de potencia real.

## Hardware

- Board: ESP32 DevKit C
- Sensor: GY-521 (MPU-6050)
- IDE: Arduino IDE 2.0+
- Upload speed: 921600
- Serial monitor: 115200 baud

## Protocolo BLE

**Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

| UUID | Tipo | Descripción |
|---|---|---|
| `beb5483e-36e1-4688-b7f5-ea07361b26a8` | NOTIFY | Datos del sensor (16 bytes) |
| `beb5483e-36e1-4688-b7f5-ea07361b26a9` | READ | Versión del firmware (1 byte: `0x02`) |

### Packet V2 — 16 bytes

```
bytes 0-3:   uint32  timestamp (ms)
bytes 4-5:   int16   ax  (raw ADC / 16)
bytes 6-7:   int16   ay  (raw ADC / 16)
bytes 8-9:   int16   az  (raw ADC / 16)
bytes 10-11: int16   gx  (raw ADC / 16)
bytes 12-13: int16   gy  (raw ADC / 16)
bytes 14-15: int16   gz  (raw ADC / 16)
```

### Rangos esperados (±16g, MPU-6050)

| Estado | ax/ay (raw/16) | az (raw/16) | magnitude |
|---|---|---|---|
| Reposo | ≈0 | ≈128 (gravedad) | ≈128 |
| Golpe normal (~5g) | ≈640 | ≈128 | ≈650 |
| Golpe fuerte (~10g+) | ≈1280 | ≈128 | ≈1284+ |

## Firmware completo (Arduino)

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <I2Cdev.h>
#include <MPU6050.h>
#include <Wire.h>
#include <math.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define VERSION_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define SENSOR_VERSION      2

// Umbral de notificación (magnitude raw/16 — ajustar según perfil)
#define NOTIFY_THRESHOLD    150

MPU6050 mpu;
BLECharacteristic* pDataChar;
BLECharacteristic* pVersionChar;
bool deviceConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override { deviceConnected = true; }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    BLEDevice::startAdvertising();
  }
};

void setup() {
  Serial.begin(115200);
  Wire.begin();
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("MPU6050 connection failed");
    while (1) {}
  }

  BLEDevice::init("HIT_TRACKER_PROTOTIPO");
  BLEServer* pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pDataChar = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pDataChar->addDescriptor(new BLE2902());

  uint8_t ver = SENSOR_VERSION;
  pVersionChar = pService->createCharacteristic(
    VERSION_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  pVersionChar->setValue(&ver, 1);

  pService->start();
  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  BLEDevice::startAdvertising();

  Serial.println("HIT TRACKER V2 listo");
}

void loop() {
  if (!deviceConnected) {
    delay(20);
    return;
  }

  int16_t ax_raw, ay_raw, az_raw, gx_raw, gy_raw, gz_raw;
  mpu.getAcceleration(&ax_raw, &ay_raw, &az_raw);
  mpu.getRotation(&gx_raw, &gy_raw, &gz_raw);

  int16_t ax = ax_raw / 16;
  int16_t ay = ay_raw / 16;
  int16_t az = az_raw / 16;
  int16_t gx = gx_raw / 16;
  int16_t gy = gy_raw / 16;
  int16_t gz = gz_raw / 16;

  int32_t mag2 = (int32_t)ax * ax + (int32_t)ay * ay + (int32_t)az * az;
  float magnitude = sqrtf((float)mag2);

  if (magnitude > NOTIFY_THRESHOLD) {
    uint32_t timestamp = millis();
    uint8_t buffer[16];
    memcpy(&buffer[0],  &timestamp, 4);
    memcpy(&buffer[4],  &ax, 2);
    memcpy(&buffer[6],  &ay, 2);
    memcpy(&buffer[8],  &az, 2);
    memcpy(&buffer[10], &gx, 2);
    memcpy(&buffer[12], &gy, 2);
    memcpy(&buffer[14], &gz, 2);

    pDataChar->setValue(buffer, 16);
    pDataChar->notify();
  }

  delay(20); // ~50 Hz
}
```

## Diferencias respecto a V1

| Aspecto | V1 | V2 |
|---|---|---|
| Packet | 28 bytes | 16 bytes |
| Valores ax/ay/az | float32 m/s² | int16 raw/16 |
| magnitude (reposo) | ≈9.8 | ≈128 |
| magnitude (golpe fuerte) | ≈50-100 | ≈800-1500+ |
| `SENSOR_VERSION` | 1 | 2 |

## Nota de calibración

Los perfiles de calibración (`threshold`, `sensitivity`) creados con V1 están ajustados para magnitudes en m/s² (típicamente threshold=12-15). Con V2 los valores son ~10× mayores — será necesario recalibrar los perfiles tras flashear el firmware V2.
