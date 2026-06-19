# HIT TRACKER — Sensor V3 (SD + Sesión autónoma)

Evolución de V2. Añade un módulo micro SD al sensor para grabar sesiones localmente sin necesidad de app ni conexión BLE. El usuario entrena, y al conectar el sensor a la app los datos se importan automáticamente.

---

## Cambios respecto a V2

| Aspecto | V2 | V3 |
|---|---|---|
| Almacenamiento | Solo BLE (tiempo real) | Micro SD + BLE |
| Uso sin app | No | Sí — sesión autónoma con botón |
| Botón de acción | No | Sí — inicia / finaliza sesión en SD |
| Dependencia de app | Obligatoria para entrenar | Opcional — se importa después |

---

## Componentes nuevos respecto a V2

### Módulo micro SD — SPI

| Especificación | Valor |
|---|---|
| Interfaz | SPI |
| Voltaje | 3.3V (usar módulo con regulador) |
| Capacidad soportada | microSD hasta 32 GB (FAT32) |
| Consumo | ~80-100 mA en escritura |
| Pines | MISO, MOSI, SCK, CS |

> Usar módulo con regulador de nivel integrado (3.3V). El ESP32 trabaja a 3.3V; una SD directa a 5V puede dañar los pines.

---

## Diagrama de Conexión — V3

```
                    ┌─────────────────────────────────────┐
                    │           BATERÍA LiPo               │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │         TP4056 + protección          │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │       INTERRUPTOR ON/OFF             │
                    └──────────────┬──────────────────────┘
                                   │
                    ┌──────────────▼──────────────────────┐
                    │               ESP32                  │
                    │                                      │
                    │  GPIO 21 ──→ SDA (MPU-6050)         │
                    │  GPIO 22 ──→ SCL (MPU-6050)         │
                    │                                      │
                    │  GPIO 18 ──→ SCK  (SD)              │
                    │  GPIO 19 ←── MISO (SD)              │
                    │  GPIO 23 ──→ MOSI (SD)              │
                    │  GPIO  5 ──→ CS   (SD)              │
                    │                                      │
                    │  GPIO 34 ←── Botón acción           │
                    │  GPIO  2 ──→ LED estado             │
                    └──────────────────────────────────────┘
```

### Pines ESP32 — V3 (completos)

| GPIO | Función |
|---|---|
| 21 | SDA (I2C → MPU-6050) |
| 22 | SCL (I2C → MPU-6050) |
| 18 | SCK (SPI → SD) |
| 19 | MISO (SPI → SD) |
| 23 | MOSI (SPI → SD) |
| 5 | CS (SPI → SD, chip select) |
| 34 | Botón acción (INPUT_PULLUP) |
| 2 | LED de estado |

---

## Formato de datos en SD

Los datos se guardan en archivos CSV ligeros, no JSON — más rápido de escribir en tiempo real y más fácil de parsear en la app.

```
/HitTracker/
└─ sessions/
   ├─ session_20260619_143022.csv
   ├─ session_20260620_091500.csv
   └─ ...
```

### Estructura del CSV

```
# HitTracker Session
# date: 2026-06-19
# start: 143022
# version: 3
timestamp_ms,ax,ay,az,magnitude
0,9.82,0.12,-0.08,9.82
10,10.45,1.23,-0.22,10.53
20,25.10,8.45,-1.10,26.52
...
```

- Una fila cada 10ms (100 Hz) — solo cuando hay movimiento (`magnitude > umbral`)
- El archivo se cierra correctamente al pulsar el botón por segunda vez
- Si hay corte de batería, el archivo queda incompleto pero parseable hasta el último registro escrito

---

## Firmware — Cambios respecto a V2

En la sección de identidad, cambiar la versión:

```cpp
#define SENSOR_VERSION 3   // activa "Recuperar sesiones del sensor" en la app
```

### Inicialización SD

```cpp
#include <SD.h>
#include <SPI.h>

#define SD_CS_PIN 5

bool sdAvailable = false;
File sessionFile;
bool sessionActive = false;

void setup() {
  // ... setup de V2 ...

  sdAvailable = SD.begin(SD_CS_PIN);
  if (!sdAvailable) {
    Serial.println("SD no disponible");
    // El sensor sigue funcionando en modo BLE-only
  }
}
```

### Botón acción — lógica completa V3

```cpp
void handleButton() {
  static bool lastState = HIGH;
  static uint32_t pressTime = 0;
  bool state = digitalRead(BTN_ACTION_PIN);

  if (state == LOW && lastState == HIGH) {
    pressTime = millis();
  }

  if (state == HIGH && lastState == LOW) {
    uint32_t held = millis() - pressTime;
    if (held < 50) return; // debounce

    if (!sessionActive) {
      startLocalSession();
    } else {
      stopLocalSession();
    }
  }

  lastState = state;
}

void startLocalSession() {
  if (!sdAvailable) {
    blinkLED(5); // error: SD no disponible
    return;
  }

  // Nombre de archivo con timestamp (RTC o millis si no hay RTC)
  char filename[40];
  snprintf(filename, sizeof(filename), "/HitTracker/sessions/session_%lu.csv", millis());

  SD.mkdir("/HitTracker/sessions");
  sessionFile = SD.open(filename, FILE_WRITE);

  if (!sessionFile) {
    blinkLED(5);
    return;
  }

  sessionFile.println("# HitTracker Session");
  sessionFile.println("timestamp_ms,ax,ay,az,magnitude");
  sessionFile.flush();

  sessionActive = true;
  blinkLED(2); // confirmación: sesión iniciada
  Serial.println("Sesión autónoma iniciada");
}

void stopLocalSession() {
  if (sessionFile) {
    sessionFile.close();
  }
  sessionActive = false;
  blinkLED(3); // confirmación: sesión guardada
  Serial.println("Sesión guardada en SD");
}
```

### Loop — escritura en SD

```cpp
void loop() {
  handleButton();

  static uint32_t lastReadTime = 0;
  uint32_t currentTime = millis();

  if (currentTime - lastReadTime >= INTERVAL_MS) {
    lastReadTime = currentTime;

    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    float magnitude = sqrt(
      a.acceleration.x * a.acceleration.x +
      a.acceleration.y * a.acceleration.y +
      a.acceleration.z * a.acceleration.z
    );

    // Escribir en SD si hay sesión activa y hay movimiento
    if (sessionActive && magnitude > 11.0) {
      char line[80];
      snprintf(line, sizeof(line), "%lu,%.2f,%.2f,%.2f,%.2f",
        currentTime,
        a.acceleration.x,
        a.acceleration.y,
        a.acceleration.z,
        magnitude
      );
      sessionFile.println(line);
      sessionFile.flush(); // flush cada lectura para no perder datos si hay corte
    }

    // Enviar via BLE si hay cliente conectado (funciona en paralelo)
    if (deviceConnected && magnitude > 11.0) {
      sendViaBLE(/* ... */);
    }
  }
}
```

### Estados del LED — V3

| Estado | LED |
|---|---|
| Encendido, sin BLE, sin sesión | Encendido fijo |
| Conectado vía BLE | Parpadeo lento (1s) |
| Sesión autónoma activa | Parpadeo rápido (200ms) |
| Sesión guardada correctamente | 3 parpadeos cortos |
| Error SD (no disponible) | 5 parpadeos rápidos |
| Batería baja | Parpadeo doble cada 5s |

---

## Protocolo de importación BLE

Cuando la app se conecta al sensor, puede solicitar la lista de sesiones guardadas e importarlas.

### Characteristics BLE adicionales — V3

| UUID | Tipo | Función |
|---|---|---|
| `...SENSOR_DATA` | NOTIFY | Stream de datos en tiempo real (igual que V1/V2) |
| `...SESSION_LIST` | READ | Lista de sesiones en SD (JSON: `[{name, size, date}]`) |
| `...SESSION_TRANSFER` | WRITE/NOTIFY | Protocolo de transferencia por bloques |
| `...SESSION_DELETE` | WRITE | Marcar sesión como importada / eliminar |

### Flujo de importación

```
App conecta vía BLE
  ↓
App lee SESSION_LIST → recibe lista de sesiones pendientes
  ↓
App solicita sesión por nombre (escribe en SESSION_TRANSFER)
  ↓
Sensor envía archivo en bloques de 512 bytes (NOTIFY)
  ↓
App reconstruye el CSV y convierte a Training JSON
  ↓
App escribe en SESSION_DELETE → sensor marca como importada
  ↓
Repetir para siguientes sesiones
```

---

## Consideraciones de diseño

- **flush() frecuente**: escribir `sessionFile.flush()` tras cada línea es más lento pero garantiza que los datos no se pierden si la batería se agota durante el entrenamiento. Alternativa: flush cada 10 lecturas (tradeoff velocidad/seguridad).
- **RTC opcional**: sin RTC el nombre del archivo usa `millis()` (ms desde arranque), no una fecha real. La fecha real se puede obtener de la app vía BLE al conectar y renombrar el archivo en ese momento.
- **Coexistencia BLE + SD**: el ESP32 puede escribir en SD y transmitir BLE simultáneamente, pero el bus SPI de la SD y el WiFi/BLE comparten recursos internos. Si hay latencia BLE, reducir la frecuencia de flush.
- **Capacidad**: a 100 Hz con movimiento continuo, cada sesión de 1 hora genera ~1 MB. Una SD de 4 GB aguanta miles de sesiones.

---

## Problemas comunes — Nuevos en V3

| Problema | Causa | Solución |
|---|---|---|
| SD no detectada | CS pin incorrecto o módulo sin regulador 3.3V | Verificar pin CS y voltaje del módulo |
| Archivo corrupto | Corte de batería durante escritura | Usar `flush()` frecuente; FAT32 aguanta corrupción parcial |
| Latencia BLE alta | SPI y BLE compartiendo recursos | Reducir frecuencia de flush o transmitir BLE solo cuando hay golpe |
| Sesión no finaliza | Botón sin debounce o `sessionFile` no cerrado | Verificar debounce ≥50ms y `sessionFile.close()` |

---

## Referencias adicionales

- [ESP32 SD Library](https://github.com/espressif/arduino-esp32/tree/master/libraries/SD)
- [SD + BLE coexistencia](https://randomnerdtutorials.com/esp32-microsd-card-arduino/)
- Ver `SENSOR-TECNICO-V2.md` para batería, TP4056 y botones
- Ver `SENSOR-TECNICO-V1.md` para base de firmware BLE y MPU-6050
