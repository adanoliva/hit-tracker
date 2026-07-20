# HIT TRACKER — Sensor Técnico V5

## Resumen de cambios respecto a V3

| Aspecto | V3 | V5 |
|---|---|---|
| LEDs indicadores | Ninguno | 4 LEDs (Rojo/Azul/Verde/Amarillo) |
| Monitorización batería | No | Sí — ADC + divisor de voltaje |
| BLE characteristic batería | No | Sí — READ, uint8 (0-100 %) |
| Protocolo hit NOTIFY | `{uint32 ts, uint16 mag}` 6 bytes | Igual |
| Protocolo CONFIG WRITE | `{uint16 threshold, uint16 cooldown}` 4 bytes | Igual |
| Detección de golpes | Firmware (igual que V3) | Igual |
| NVS config | Igual que V3 | Igual |

---

## Hardware requerido

### Componentes base (igual que GUIA-CONEXION-V1)

| Componente | Modelo | Función |
|---|---|---|
| ESP32 DevKit V1 | 30 pines | Microcontrolador |
| MPU-6050 (GY-521) | — | Acelerómetro/giroscopio |
| Batería 18650 | Tenpower INR18650-26ME 2600 mAh | Fuente de energía |
| TP4056 con DW01 | — | Carga y protección batería |
| LM2596 | Ajustado a 3.3 V | Regulación de voltaje |
| Condensadores | 1000 µF 25 V × 2 | Filtrado TP4056 OUT y LM2596 OUT |

### Componentes adicionales V5

| Componente | Cantidad | Valor | Función |
|---|---|---|---|
| Resistor | 2 | 100 kΩ | Divisor de voltaje para ADC de batería |
| LED 5 mm Rojo | 1 | — | Indicador de encendido |
| LED 5 mm Azul | 1 | — | Indicador BLE conectado |
| LED 5 mm Verde | 1 | — | Reserva |
| LED 5 mm Amarillo | 1 | — | Indicador de golpe detectado |
| Resistor | 4 | 220 Ω | Limitador de corriente LEDs |

---

## Pinout V5

| GPIO | Dirección | Función |
|---|---|---|
| 21 | OUT (I2C) | SDA → MPU-6050 |
| 22 | OUT (I2C) | SCL → MPU-6050 |
| 2 | OUT | LED Rojo (encendido) |
| 4 | OUT | LED Azul (BLE conectado) |
| 13 | OUT | LED Amarillo (golpe detectado) |
| 15 | OUT | LED Verde (reserva) |
| 34 | IN (ADC) | Batería — divisor de voltaje |

### ⚠️ Corrección respecto a GUIA-CONEXION-V1

La guía asigna **GPIO 35** al LED amarillo de golpes. **GPIO 35 en ESP32 DevKit V1 es input-only** — no puede manejar una carga de salida. El LED amarillo debe conectarse a **GPIO 13** en su lugar.

El resto de asignaciones de la guía (GPIO 2, 4, 15) son correctas.

---

## Esquema de conexión V5

```
Batería 18650 (3.7-4.2 V)
        ↓
   TP4056 (carga + protección DW01)
        ↓
   LM2596 (regulado a 3.3 V)
        ↓
   ESP32 DevKit V1
   │
   ├── GPIO 21 ──→ SDA (MPU-6050)
   ├── GPIO 22 ──→ SCL (MPU-6050)
   │
   ├── GPIO  2 ──→ [220Ω] ──→ LED Rojo  (+) → GND
   ├── GPIO  4 ──→ [220Ω] ──→ LED Azul  (+) → GND
   ├── GPIO 13 ──→ [220Ω] ──→ LED Amarillo (+) → GND   ← NO GPIO 35
   ├── GPIO 15 ──→ [220Ω] ──→ LED Verde  (+) → GND
   │
   └── GPIO 34 ←── Nodo de divisor de voltaje (ver abajo)

Divisor de voltaje (batería → ADC):
   Bat(+) ──→ R1 (100 kΩ) ──→ GPIO 34 ──→ R2 (100 kΩ) ──→ GND

GND COMÚN: ESP32 GND = LM2596 OUT(-) = MPU GND = TP4056 OUT(-) = todos los cátodos de LEDs
```

---

## Monitorización de batería

### Circuito

El divisor de voltaje reduce la tensión de la batería (máx 4.2 V) a la mitad (máx 2.1 V), dentro del rango seguro del ADC del ESP32 (0-3.3 V con atenuación 11 dB).

```
V_adc = V_bat × R2 / (R1 + R2) = V_bat / 2
V_bat = V_adc × 2
V_adc = analogRead(34) / 4095.0 × 3.3
```

### Umbrales 18650

| Voltaje | Estado |
|---|---|
| 4.2 V | 100 % (cargada) |
| 3.7 V | ~50 % |
| 3.5 V | 0 % (mínimo operativo) |
| < 3.0 V | Protección TP4056/DW01 corta |

La app puede leer el porcentaje vía la BLE characteristic `BATTERY_CHAR_UUID`.

---

## Comportamiento de LEDs

| LED | GPIO | Color | Estado normal | Batería baja (≤ 20 %) |
|---|---|---|---|---|
| Encendido | 2 | Rojo | Encendido fijo | Doble destello cada 5 s |
| BLE | 4 | Azul | Apagado sin conexión; parpadeo 1 Hz con cliente | Sin cambio |
| Reserva | 15 | Verde | Apagado | Sin cambio |
| Golpe | 13 | Amarillo | Destello 50 ms en cada golpe | Sin cambio |

### Secuencia de doble destello (batería baja)

El LED rojo parpadea dos veces (120 ms ON/OFF) y vuelve a apagarse. Ciclo cada 5 segundos.

```
Normal:     ████████████████████████  (fijo)
Baja ≤20%: ██░░██░░░░░░░░░░░░░░░░░░  (doble destello cada 5 s)
           ↑120ms
```

---

## BLE Characteristics V5

| UUID (sufijo) | Tipo | Descripción | Formato |
|---|---|---|---|
| `...26a8` | NOTIFY | Hit events | `{uint32 timestamp_ms, uint16 magnitude}` — 6 bytes |
| `...26a9` | READ | Versión firmware | `uint8 = 5` — 1 byte |
| `...26aa` | WRITE | Config: threshold + cooldown | `{uint16 threshold_raw, uint16 cooldown_ms}` — 4 bytes |
| `...26ab` | READ | Nivel de batería | `uint8 = 0-100 (%)` — 1 byte |

Service UUID completo: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

La characteristic de batería (`...26ab`) es de solo lectura. La app puede consultarla al conectar y periódicamente para mostrar el nivel al usuario.

---

## Firmware — Notas de implementación

### LEDs no bloqueantes

Todos los patrones de LED se gestionan en `ledsUpdate(now)` con temporizadores basados en `millis()`. No hay ningún `delay()` en el loop principal excepto el de 1 ms del muestreo.

### Lectura ADC de batería

Se promedian 8 lecturas para reducir el ruido inherente del ADC del ESP32. La lectura se realiza cada 30 segundos y actualiza tanto la variable interna `battPct` como el valor de la BLE characteristic.

```
ADC atenuación: ADC_11db (rango 0-3.9 V)
Promedio: 8 muestras con 2 ms entre lecturas
Fórmula: pct = (V_bat - 3.5) / (4.2 - 3.5) × 100, clamped 0-100
```

### Error MPU-6050 al arrancar

Si el MPU-6050 no responde al inicializar, el firmware hace un parpadeo rápido del LED rojo (10 × 100 ms) y entra en bucle infinito. Esto facilita el diagnóstico de problemas de conexión I2C sin necesidad de monitor serie.

---

## Librerías requeridas

Las mismas que V3 — no hay dependencias nuevas:

- **MPU6050** (by Electronic Cats) — Arduino Library Manager
- **I2Cdev** — incluida con la anterior
- **ESP32 BLE Arduino** — incluida en el board package `esp32`

---

## Configuración de compilación

| Parámetro | Valor |
|---|---|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 |
| Serial Monitor | 115200 baud |
| Partition Scheme | Default 4MB with spiffs |

---

## Comparativa versiones de firmware

| Versión | Archivo | LEDs | Batería ADC | Protocolo BLE | Detección |
|---|---|---|---|---|---|
| V1 | HitTracker_V1.ino | No | No | Stream 16 bytes/10ms | App (software) |
| V2 | HitTracker_V2.ino | No | No | Stream 16 bytes/10ms | App (software) |
| V3 | HitTracker_V3.ino | No | No | Hit events 6 bytes | Firmware (decay lineal) |
| V4 | HitTracker_V4.ino | No | No | Hit events 6 bytes | Firmware (decay exponencial, ver `SENSOR-TECNICO-V4.md`) |
| **V5** | **HitTracker_V5.ino** | **4 LEDs** | **Sí (GPIO 34)** | **Hit events 6 bytes + batería** | **Firmware (decay lineal, sobre V3)** |
