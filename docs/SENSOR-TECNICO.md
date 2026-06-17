# HIT TRACKER - Documento Técnico del Sensor

## Descripción General

El sistema de sensores de HIT TRACKER captura movimiento en 6 ejes (aceleración + rotación) usando el módulo GY-521 (MPU-6050) acoplado a un ESP32. Los datos se transmiten vía Bluetooth Low Energy (BLE) a la aplicación de escritorio.

---

## Componentes

### 1. ESP32-32D (Microcontrolador)

| Especificación | Valor |
|---|---|
| Microcontrolador | Xtensa Dual-Core 32-bit |
| Velocidad | 160 MHz |
| RAM | 520 KB |
| Flash | 4 MB |
| Bluetooth | 4.2 + BLE |
| WiFi | 802.11 b/g/n |
| I2C | Sí (pines configurable) |
| Alimentación | 5V / 3.3V regulado |
| Consumo | ~80 mA (activo) |

**Puertos utilizados:**
- GPIO 21: SDA (I2C)
- GPIO 22: SCL (I2C)
- GND: Ground
- 3.3V: Alimentación

### 2. Módulo GY-521 (MPU-6050)

| Especificación | Valor |
|---|---|
| Acelerómetro | 3-axis, ±16g seleccionable |
| Giroscopio | 3-axis, ±2000°/s seleccionable |
| Rango de temperatura | -40°C a +85°C |
| Interfaz | I2C (0x68 default) |
| Voltaje | 3.3V-5V |
| Consumo | ~3.5 mA |
| Tamaño | 21mm x 16mm |

**Ejes:**
- X: lateral (izq-dcha)
- Y: vertical (arriba-abajo)
- Z: profundidad (delante-atrás)

---

## Diagrama de Conexión

### Esquema Eléctrico

```
ESP32                           GY-521 (MPU-6050)
┌─────────────────┐            ┌──────────────────┐
│                 │            │                  │
│  GPIO 21 (SDA)──┼────I2C─────┼─→ SDA            │
│  GPIO 22 (SCL)──┼────I2C─────┼─→ SCL            │
│  3.3V ──────────┼────PWR─────┼─→ VCC            │
│  GND ───────────┼────GND─────┼─→ GND            │
│                 │            │  AD0 = GND       │
│                 │            │  (dirección I2C) │
└─────────────────┘            └──────────────────┘
```

### Tabla de Pines

| ESP32 Pin | Función | GY-521 Pin | Función |
|---|---|---|---|
| GPIO 21 | SDA (I2C) | SDA | Data |
| GPIO 22 | SCL (I2C) | SCL | Clock |
| 3.3V | Power | VCC | Power (3.3V) |
| GND | Ground | GND | Ground |
| - | - | AD0 | GND (dirección 0x68) |

### Foto/Diagrama de Montaje

```
ESP32 (vista frontal)
┌────────────────────┐
│  GPIO 21 ─→ SDA    │
│  GPIO 22 ─→ SCL    │
│  3.3V ─→ +         │
│  GND ─→ -          │
└─────────────────────┘
        ║   (pines hembra-hembra)
        ║
┌─────────────────────┐
│ GY-521 (soldado)    │
│  SDA ←─ pin 21      │
│  SCL ←─ pin 22      │
│  +3.3V ← 3.3V       │
│  GND ← GND          │
└─────────────────────┘
```

---

## Especificaciones de Datos

### Formato de Lectura I2C

El MPU-6050 devuelve datos en dos bytes por eje (16-bit signed).

```
Acelerómetro (3 ejes):
├─ AX: bytes 0x3B-0x3C
├─ AY: bytes 0x3D-0x3E
└─ AZ: bytes 0x3F-0x40

Giroscopio (3 ejes):
├─ GX: bytes 0x43-0x44
├─ GY: bytes 0x45-0x46
└─ GZ: bytes 0x47-0x48

Rango configurable (firmware):
├─ Acelerómetro: ±2g, ±4g, ±8g, ±16g
└─ Giroscopio: ±250°/s, ±500°/s, ±1000°/s, ±2000°/s
```

### Packet BLE (Estructura de Datos)

```
Cada lectura transmitida:

{
  timestamp: uint32,        // ms desde inicio
  ax: float,               // aceleración X (m/s²)
  ay: float,               // aceleración Y (m/s²)
  az: float,               // aceleración Z (m/s²)
  gx: float,               // rotación X (°/s)
  gy: float,               // rotación Y (°/s)
  gz: float                // rotación Z (°/s)
}

Tamaño total: ~28 bytes
Frecuencia: 100 Hz (cada 10ms)
```

### Cálculo de Magnitud

```
magnitude = sqrt(ax² + ay² + az²)

Rango esperado:
├─ Reposo: ~9.8 m/s² (gravedad)
├─ Movimiento ligero: 10-20 m/s²
├─ Golpe normal: 25-50 m/s²
└─ Golpe fuerte: 50-100+ m/s²
```

---

## Firmware (Código Arduino)

### Configuración Inicial

```cpp
#include <Wire.h>
#include <MPU6050.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// Pines I2C
#define SDA_PIN 21
#define SCL_PIN 22

// Dirección I2C del MPU6050
const uint8_t MPU_ADDR = 0x68;

// Objeto del sensor
MPU6050 mpu(Wire, MPU_ADDR);

// Variables BLE
BLEServer* pServer = nullptr;
BLECharacteristic* pCharacteristic = nullptr;
bool deviceConnected = false;
uint32_t lastNotifyTime = 0;

// Configuración
const uint16_t SAMPLE_RATE = 100;  // 100 Hz
const uint16_t INTERVAL_MS = 10;   // 10 ms entre lecturas
```

### Inicialización

```cpp
void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Inicializar I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Inicializar MPU6050
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found!");
    while (1) delay(1000);
  }
  
  // Configurar acelerómetro (±16g)
  mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  
  // Configurar giroscopio (±2000°/s)
  mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
  
  // Frecuencia de muestreo: 100 Hz
  mpu.setFilterBandwidth(MPU6050_BAND_94_HZ);
  
  // Inicializar BLE
  initBLE();
  
  Serial.println("Setup completo. Esperando conexión BLE...");
}
```

### Loop Principal (Lectura de Sensores)

```cpp
void loop() {
  static uint32_t lastReadTime = 0;
  uint32_t currentTime = millis();
  
  // Leer sensores cada 10ms (100Hz)
  if (currentTime - lastReadTime >= INTERVAL_MS) {
    lastReadTime = currentTime;
    
    // Obtener evento del sensor
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    // Calcular magnitud
    float magnitude = sqrt(
      a.acceleration.x * a.acceleration.x +
      a.acceleration.y * a.acceleration.y +
      a.acceleration.z * a.acceleration.z
    );
    
    // Crear estructura de datos
    SensorReading reading = {
      timestamp: currentTime,
      ax: a.acceleration.x,
      ay: a.acceleration.y,
      az: a.acceleration.z,
      gx: g.gyro.x,
      gy: g.gyro.y,
      gz: g.gyro.z,
      magnitude: magnitude
    };
    
    // Enviar via BLE si hay cliente conectado
    if (deviceConnected && shouldNotify(magnitude)) {
      sendViaBLE(reading);
    }
  }
  
  delay(1);
}
```

### Lógica de Detección de Movimiento

```cpp
// Solo transmitir cuando hay movimiento significativo
bool shouldNotify(float magnitude) {
  const float MOVEMENT_THRESHOLD = 11.0;  // 1g arriba de gravedad
  static float lastMagnitude = 9.8;
  
  // Cambio significativo
  bool hasMovement = abs(magnitude - lastMagnitude) > 0.5;
  lastMagnitude = magnitude;
  
  return hasMovement;
}
```

### Funciones BLE

```cpp
void initBLE() {
  // Crear dispositivo BLE
  BLEDevice::init("HIT_TRACKER");
  
  // Crear servidor
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  
  // Crear servicio
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // Crear característica (notificación)
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Iniciar servicio
  pService->start();
  
  // Iniciar advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);
  BLEDevice::startAdvertising();
}

void sendViaBLE(SensorReading reading) {
  // Empaquetar datos en buffer
  uint8_t buffer[28];
  memcpy(&buffer[0], &reading.timestamp, 4);
  memcpy(&buffer[4], &reading.ax, 4);
  memcpy(&buffer[8], &reading.ay, 4);
  memcpy(&buffer[12], &reading.az, 4);
  memcpy(&buffer[16], &reading.gx, 4);
  memcpy(&buffer[20], &reading.gy, 4);
  memcpy(&buffer[24], &reading.gz, 4);
  
  // Enviar notificación
  pCharacteristic->setValue(buffer, 28);
  pCharacteristic->notify();
}

class ServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Cliente conectado");
  }
  
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Cliente desconectado");
  }
};
```

---

## Calibración del Sensor

### Procedimiento de Calibración

1. **Offset de Acelerómetro** (gravedad)
```cpp
// Colocar sensor plano en superficie
// El eje Z debe leer ~9.8 m/s²
mpu.calibrateAccel();
```

2. **Offset de Giroscopio** (drift)
```cpp
// Sensor en reposo
// Debe leer ~0 en todos los ejes
mpu.calibrateGyro();
```

3. **Verificar lecturas**
```cpp
Serial.print("AX: "); Serial.println(a.acceleration.x);
Serial.print("AY: "); Serial.println(a.acceleration.y);
Serial.print("AZ: "); Serial.println(a.acceleration.z);
```

---

## Testing del Hardware

### Verificación I2C

```cpp
void testI2C() {
  Serial.println("Escaneando dispositivos I2C...");
  
  for (uint8_t addr = 0x68; addr < 0x69; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("Encontrado dispositivo en: 0x");
      Serial.println(addr, HEX);
    }
  }
}
```

### Verificación BLE

```cpp
// En Monitor Serial
// Debe mostrar:
// - "Setup completo. Esperando conexión BLE..."
// - "Cliente conectado" cuando conecta desde app
// - Lecturas de sensor cada 10ms
```

---

## Problemas Comunes

| Problema | Causa | Solución |
|---|---|---|
| MPU6050 not found | Conexión I2C incorrecta | Verificar pines SDA/SCL, revisar direccion 0x68 |
| Datos erráticos | Ruido en alimentación | Usar capacitor 100µF entre VCC-GND del sensor |
| BLE no conecta | Dispositivo no visible | Reiniciar ESP32, verificar initBLE() |
| Latencia alta | Buffer BLE lleno | Reducir frecuencia de notificaciones |
| Lecturas incorrectas | Sensor no calibrado | Ejecutar calibración en setup |

---

## Especificaciones Finales

| Parámetro | Valor |
|---|---|
| Rango aceleración | ±16g |
| Rango giroscopio | ±2000°/s |
| Frecuencia muestreo | 100 Hz |
| Latencia | ~10-50 ms |
| Rango BLE | ~30 metros |
| Consumo energía | ~80 mA (ESP32) + 3.5 mA (MPU) |
| Tiempo de batería | ~6-8 horas (batería 1000 mAh) |

---

## Referencias

- [MPU-6050 Datasheet](https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6050_DataSheet_V3.4.pdf)
- [ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/)
- [Arduino MPU6050 Library](https://github.com/jrowberg/i2cdevlib/tree/master/Arduino/MPU6050)
- [ESP32 BLE Documentation](https://randomnerdtutorials.com/esp32-bluetooth-low-energy-ble-arduino-ide/)
