# Roadmap — Hit Tracker

## App Mobile

### V1 — Base *(completo)*

| | Feature |
|---|---|
| ✅ | Detección de golpes en tiempo real via BLE |
| ✅ | Sesiones con rondas, descansos y modo libre |
| ✅ | Dashboard con historial y progreso |
| ✅ | Perfiles de usuario y calibración manual |
| ✅ | Wizard de calibración guiado (golpes ligeros/fuertes → sugiere threshold + sensitivity + rebound) |
| ✅ | App mobile Android (Expo + React Native) |
| ✅ | Sensor ESP32 conectado via BLE |
| ✅ | Filtrado BLE por SERVICE_UUID — solo sensores HIT TRACKER aparecen en el escaneo |
| ✅ | `HT-002` Detalle de sesión con gráfico scatter por round |
| ✅ | `HT-003` Compartir sesión (PNG + texto) |
| ✅ | `HT-008` Power máximo basado en media de las últimas 5 sesiones |
| ✅ | `HT-010` Sistema de migraciones de datos (migrationService) |
| ✅ | `HT-014` / `HT-V3` Asistente de auto-calibración guiado + firmware V3 (detección en sensor, sync BLE) |

### V1.1 — Entrenamiento físico *(completo)*

| | Feature |
|---|---|
| ✅ | Módulo Entrenamiento: planes con calentamiento + core + boxeo |
| ✅ | WorkoutPlan: crear, editar, ejecutar, eliminar planes |
| ✅ | WorkoutPlayer: player de ejercicios físicos con timer/reps, descanso, saltar |
| ✅ | Catálogo de ejercicios con tabs Calentamiento/Core/Boxing |
| ✅ | Ejercicios custom por categoría |
| ✅ | Integración wger API — búsqueda e importación de ejercicios |
| ✅ | RoundComboEditor — combos por round con notación de boxeo |
| ✅ | Fase de boxeo sin sensor (DUMMY_DEVICE) — el plan funciona sin BLE |
| ✅ | `HT-022` Decaimiento exponencial del dynamicFloor (derivado de rebound calibrado) |
| ✅ | `HT-023` Aviso sonoro al superar el máximo histórico (con ducking de audio) |
| ✅ | `HT-024` Aviso de bajada de cadencia, independiente de fatiga por potencia |
| ✅ | `HT-004-a` Autenticación Google y gestión de cuenta (base para backup en Drive) |
| ✅ | `HT-004-b` Sincronización automática de sesiones con Google Drive |
| ✅ | `HT-004-c` Sincronización de perfiles de calibración con Google Drive (resolución de conflictos) |

### V2 — Calibración avanzada *(pendiente)*

| | Feature |
|---|---|
| ⬜ | `HT-006-a` Calibración vinculada a dispositivo (per Device.mac, no per perfil) |
| ⬜ | Nombre de dispositivo personalizable (definido en firmware antes de flashear) |
| ⬜ | PIN de emparejamiento BLE (definido en firmware) |

### V3 — Multi-usuario *(pendiente)*

| | Feature |
|---|---|
| ⬜ | Multi-sensor / multi-usuario: sesión de grupo con vista por usuario en tiempo real |
| ⬜ | `deviceStore` → `Map<profileId, deviceMac>` |
| ⬜ | Una instancia de `useSensorData` por usuario |
| ⬜ | Control de fase global sincronizado para todos los usuarios |

---

## Hardware / Firmware

### Fase 1 — Prototipo con batería *(validado)*

- ESP32 DevKit V1 + GY-521 en breadboard
- Batería 18650 + TP4056 + LM2596 (3.3V)
- Carga por micro-USB (vía módulo TP4056)
- Interruptor on/off físico
- Fijación al saco con cinta (pegado directamente al saco)
- **Firmware activo: V3** (detección + cooldown, sin LEDs ni batería; V4 añade decaimiento exponencial del `dynamicFloor`, pendiente de flashear; V5 soporta LEDs y monitorización de batería por código, sin montar aún en este prototipo)
- Funcionando de forma estable en uso real — validado como base fiable antes de miniaturizar

### Fase 2 — Versión MINI *(actual)*

- Migración a **ESP32-C3 Mini** (ver esquema `esp32_c3_mini_mpu6050_conexion.png`), mismo GY-521
- Reduce drásticamente el tamaño frente al DevKit V1 + batería 18650 de la Fase 1
- Carga USB-C integrada
- Pendiente: montar los 4 LEDs indicadores y la monitorización de batería (ADC), ya soportados por el firmware V5
- Firmware: adaptar V5 al ESP32-C3 (pinout distinto)

### Fase 3 — Consolidación *(pendiente)*

- ESP32-C3 Mini consolidado (LEDs + batería portados, no placa custom)
- Diseño miniaturizado en torno al C3 Mini como módulo, sin PCB a medida
- Diseño de carcasa oficial
- Pruebas de durabilidad con uso real

### Fase 4 — Mejoras y ampliación *(opcional, abierta)*

No es una fase final ni con objetivo cerrado — hueco para explorar mejoras según vayan surgiendo (autonomía sin app, nuevos sensores, optimizaciones), sin bloquear el resto del roadmap.

---
