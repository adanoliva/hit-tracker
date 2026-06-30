# HIT TRACKER — Sensor Técnico V3

## Resumen

V3 mueve la detección de golpes al propio firmware. En lugar de enviar un stream continuo de datos al móvil para que la app detecte los picos, el ESP32 detecta el golpe localmente y solo notifica por BLE cuando hay un impacto confirmado.

---

## Cambios respecto a V2

| Aspecto | V2 | V3 |
|---|---|---|
| Detección de golpes | App (software, stream continuo) | Firmware (ESP32) |
| Paquete BLE | 16 bytes cada 10 ms | 6 bytes solo al detectar golpe |
| Tráfico BLE | Alto (100 paquetes/s) | Bajo (solo en impactos) |
| Config remota | No | Sí — threshold + cooldown via BLE WRITE |
| Persistencia de config | No | Sí — NVS (Preferences), sobrevive reinicios |
| LEDs | No | No |
| Batería ADC | No | No |

---

## Hardware

Igual que V2. No se añaden componentes nuevos:
- ESP32 DevKit V1
- MPU-6050 (GY-521) via I2C (GPIO 21 SDA, GPIO 22 SCL)
- Acelerómetro configurado a ±16g

---

## Protocolo BLE

### Characteristics

| UUID (sufijo) | Tipo | Descripción | Formato |
|---|---|---|---|
| `...26a8` | NOTIFY | Hit event — solo cuando se detecta un golpe | `{uint32 timestamp_ms, uint16 magnitude}` — 6 bytes |
| `...26a9` | READ | Versión firmware | `uint8 = 3` — 1 byte |
| `...26aa` | WRITE | Config: threshold + cooldown | `{uint16 threshold_raw, uint16 cooldown_ms}` — 4 bytes |

Service UUID completo: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

### Paquete de golpe (6 bytes)

```
Bytes 0-3: uint32  timestamp_ms   — millis() del momento del golpe
Bytes 4-5: uint16  magnitude      — magnitud del pico en raw (ax²+ay²+az², escala /16)
```

La app recibe este paquete y crea un `SensorReading` con `isPeak: true`, que `useSensorData` procesa directamente sin ejecutar el algoritmo de detección de picos.

### Paquete de configuración (4 bytes, WRITE)

```
Bytes 0-1: uint16  threshold_raw  — magnitud mínima para contar como golpe (ej. 300)
Bytes 2-3: uint16  cooldown_ms    — tiempo mínimo entre golpes en ms (ej. 400)
```

La app escribe este paquete al conectar y cada vez que el usuario cambia el perfil activo (`bleConnection.sendProfileConfig`).

---

## Algoritmo de detección en firmware

```cpp
// Decaimiento del suelo dinámico hacia cfgThreshold (0.5 raw/ms)
dynamicFloor = max(cfgThreshold, dynamicFloor - 0.5 * deltaMs);

bool isRising = magnitude >= lastMagnitude;

// Pico: señal bajando, había superado el suelo, cooldown cumplido
if (!isRising && lastMagnitude > dynamicFloor && (now - lastHitTime) > cfgCooldown) {
    peakMag      = lastMagnitude;
    lastHitTime  = now;
    dynamicFloor = max(cfgThreshold, lastMagnitude * 0.4);  // sube al 40% del pico
    sendHitEvent(now, peakMag);
}
```

El algoritmo es intencionalmente el mismo que usaba la app en V2 (`useSensorData.ts`), movido al firmware para reducir tráfico BLE y latencia.

---

## Configuración persistida (NVS)

El firmware guarda `threshold_raw` y `cooldown_ms` en la NVS del ESP32 (namespace `ht-cfg`). Al reiniciar, recupera los valores del último perfil que configuró la app. Si no existe configuración previa, usa los defaults:

```
threshold_raw: 300   (equivale a profile.threshold = 30.0)
cooldown_ms:   400
```

---

## Archivo del firmware

`FIRMWARE/HitTracker_V3/HitTracker_V3.ino`

No requiere librerías adicionales respecto a V2:
- **MPU6050** (by Electronic Cats)
- **I2Cdev** (incluida con la anterior)
- **ESP32 BLE Arduino** (incluida en el board package `esp32`)

---

## Configuración de compilación

| Parámetro | Valor |
|---|---|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 |
| Serial Monitor | 115200 baud |

---

## Comparativa con V2

| Aspecto | V2 | V3 |
|---|---|---|
| Bytes por evento | 16 bytes/10ms (stream) | 6 bytes/golpe (evento) |
| Paquetes/min en reposo | ~6000 | 0 |
| Paquetes/min entrenando (≈30 golpes) | ~6000 | 30 |
| Latencia detección | ~10-20ms (app) | ~10ms (firmware) |
| Config remota | No | Sí |
| Consumo BLE | Alto | Muy bajo |
