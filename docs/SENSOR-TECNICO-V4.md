# HIT TRACKER — Sensor Técnico V4

## Resumen de cambios respecto a V3

| Aspecto | V3 | V4 |
|---|---|---|
| LEDs indicadores | Ninguno | Ninguno (igual que V3) |
| Monitorización batería | No | No (igual que V3) |
| Protocolo hit NOTIFY | `{uint32 ts, uint16 mag}` 6 bytes | Igual |
| Protocolo CONFIG WRITE | `{uint16 threshold, uint16 cooldown}` 4 bytes | Igual |
| Detección de golpes | Firmware | Firmware (igual) |
| Decaimiento `dynamicFloor` | Lineal, tasa fija 0.5 raw/ms | **Exponencial**, derivado de `cfgCooldown` |
| NVS config | Igual que V3 | Igual |

Hardware, pinout y librerías: idénticos a V3 (ver `SENSOR-TECNICO-V3.md`). Este documento cubre únicamente el cambio de algoritmo de detección.

---

## Motivación

Con decaimiento lineal fijo, un golpe fuerte (magnitud alta) tardaba hasta ~500 ms en que `dynamicFloor` bajara a la base, sin importar la magnitud del pico. Esto limitaba la detección de combos rápidos y potentes justo en el escenario donde más importa no perder golpes — mismo problema que [HT-022](../.claude/features/done/HT-022-decaimiento-exponencial-dynamicFloor.md) identificó y corrigió en el path software de la app (`useSensorData.ts`).

El firmware V3/V4/V5 detecta el golpe **en el propio sensor** (`isPeak` ya decidido antes de llegar a la app), así que el fix de HT-022 en JS nunca se ejecutaba en la práctica con estos firmwares — el decaimiento lineal seguía vivo en el `.ino`. V4 traslada el mismo criterio al firmware.

## Algoritmo

Igual que V3, pero el decaimiento de `dynamicFloor` hacia `cfgThreshold` es exponencial en vez de lineal, con `lambda` derivada de `cfgCooldown` (mismo cooldown calibrado que ya se manda por BLE, sin introducir una constante nueva de amortiguación):

```cpp
// 95% recuperado hacia cfgThreshold transcurridos cfgCooldown ms desde el pico
float lambda = -logf(FLOOR_RECOVERY_FRACTION) / (float)cfgCooldown;  // FLOOR_RECOVERY_FRACTION = 0.05f
dynamicFloor = cfgThreshold + (dynamicFloor - cfgThreshold) * expf(-lambda * deltaMs);
```

Antes:

```cpp
dynamicFloor = fmaxf((float)cfgThreshold, dynamicFloor - 0.5f * (float)deltaMs);
```

El resto del algoritmo (detección de pico, subida de `dynamicFloor` a `max(threshold, peak*0.4)` tras un golpe, cooldown) no cambia.

---

## BLE Characteristics V4

Idénticas a V3 — no hay characteristics nuevas.

| UUID (sufijo) | Tipo | Descripción | Formato |
|---|---|---|---|
| `...26a8` | NOTIFY | Hit events | `{uint32 timestamp_ms, uint16 magnitude}` — 6 bytes |
| `...26a9` | READ | Versión firmware | `uint8 = 4` — 1 byte |
| `...26aa` | WRITE | Config: threshold + cooldown | `{uint16 threshold_raw, uint16 cooldown_ms}` — 4 bytes |

Service UUID completo: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

---

## App

Sin cambios necesarios. El protocolo BLE es idéntico a V3, y `useSensorData.ts` ya trata `isPeak=true` como dato confiado del firmware sin recalcular nada.

---

## Migración desde V3

- Perfiles calibrados existentes (`threshold`/`cooldown`) siguen funcionando sin recalibrar — solo cambia cómo el firmware usa `cooldown` internamente para decaer el floor, no su valor.
- Solo requiere reflashear el ESP32 con `HitTracker_V4.ino`.

## Pendiente de validación

⚠️ No probado aún en físico. Pendiente validar con combos reales (golpe fuerte seguido de golpe suave a ~150-200ms) que antes se perdían con el decaimiento lineal — mismo caso límite señalado en QA de HT-022.

---

## Configuración de compilación

| Parámetro | Valor |
|---|---|
| Board | ESP32 Dev Module |
| Upload Speed | 921600 |
| Serial Monitor | 115200 baud |
| Partition Scheme | Default 4MB with spiffs |
