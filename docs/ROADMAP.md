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

### V2 — Calibración y nube *(pendiente)*

| | Feature |
|---|---|
| ⬜ | `HT-006-a` Calibración vinculada a dispositivo (per Device.mac, no per perfil) |
| ⬜ | `HT-004-a/b/c` Sincronización Google Drive (sesiones + perfiles) |
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

### Fase 1 — Prototipo con batería *(actual)*

- ESP32 DevKit V1 + GY-521 en breadboard
- Batería 18650 + TP4056 + LM2596 (3.3V)
- 4 LEDs indicadores (Rojo/Azul/Verde/Amarillo)
- Monitorización de batería via ADC
- Fijación al saco con bridas / cinta
- **Firmware activo: V4**

### Fase 2 — Consolidación *(pendiente)*

- PCB personalizada: ESP32 + MPU-6050 en placa compacta
- Carga USB-C integrada
- Interruptor on/off físico
- Pruebas de durabilidad con uso real

### Fase 3 — Autonomía sin app *(pendiente)*

- **Botón de acción**: inicia/finaliza sesión local
- **Micro SD**: graba sesiones sin app; importación automática al conectar BLE
- La app detecta sesiones pendientes en el sensor y las importa al historial

### Fase 4 — Producto *(pendiente)*

- Diseño de carcasa
- Impresión 3D / fabricación
- Fijación definitiva al saco (velcro, tornillos o integración en vendas)

---

## Bugs conocidos y deuda técnica

| Prioridad | Descripción |
|---|---|
| Media | Pantalla blanca antes del splash en APK release (`windowBackground` del tema Android) |
| Baja | % de valid hit configurable por perfil (actualmente sin campo `validHitThreshold` en tipos) |
