# Roadmap — Hit Tracker

## Software

### V1 — Base — primer producto demostrable

| | Feature |
|---|---|
| ✅ | Detección de golpes en tiempo real via BLE |
| ✅ | Sesiones con rondas, descansos y modo libre |
| ✅ | Dashboard con historial y progreso |
| ✅ | Perfiles de usuario y calibración manual |
| ✅ | App desktop (Windows) + app mobile (Android) |
| ✅ | Sensor ESP32 conectado via BLE en desktop y mobile |
| ⬜ | `HT-001` Eliminación de modos de prueba (mock desktop y teléfono como sensor mobile) |
| ⬜ | `HT-002` Pantalla de detalle de sesión con gráfico de golpes por round |
| ⬜ | `HT-003` Compartir sesión en redes sociales (mobile) |
| ⬜ | `HT-005` Modo Game mejorado: TOP 3 y entrada de iniciales estilo arcade |

> Con V1 completo y el sensor físico (Fase 1 hardware) ya hay un producto real y demostrable, aunque el sensor sea un ESP32 con cables pegado al saco.

### V2 — Nube y precisión BLE

| | Feature |
|---|---|
| ⬜ | `HT-004-a` Google Drive: autenticación y gestión de cuenta |
| ⬜ | `HT-004-b` Google Drive: sincronización automática de sesiones |
| ⬜ | `HT-004-c` Google Drive: sincronización de perfiles con resolución de conflictos |
| ⬜ | % de valid hits configurable por perfil |
| ⬜ | **Nombre de dispositivo personalizado**: el usuario define `DEVICE_NAME` en el firmware antes de flashear — aparece en la lista de sensores de la app para identificar cada saco |
| ⬜ | **PIN de emparejamiento BLE**: el usuario define `BLE_PIN` en el firmware — solo dispositivos que lo conozcan pueden conectar al sensor |
| ⬜ | **Filtrado de compatibilidad BLE**: la app filtra el escaneo por el `SERVICE_UUID` fijo de HIT TRACKER (`4fafc201-1fb5-459e-8fcc-c5c9c331914b`) — solo los sensores HIT TRACKER aparecen en la lista; cualquier otro dispositivo BLE cercano queda invisible |

### V3 — Calibración y multi-usuario

| | Feature |
|---|---|
| ⬜ | `HT-006-a` Nuevo modelo de datos Perfil-Sensor (DeviceCalibration) |
| ⬜ | `HT-006-b` Pantalla "Sesión activa": flujo combinado conectar sensor + seleccionar perfil |
| ⬜ | `HT-006-c` Asistente de calibración guiado (3 series: suave / normal / fuerte) |
| ⬜ | Multi-sensor / multi-usuario: sesión de grupo con vista en tiempo real por usuario |
| ⬜ | Sección Entrenamiento físico: rutinas de calentamiento, core y fullbody |

### V4 — Portabilidad de datos

| | Feature |
|---|---|
| ⬜ | **Versión de hardware**: al conectar, la app lee la versión del sensor (1/2/3) vía BLE y adapta la UI |
| ⬜ | **Sesión autónoma desde el sensor**: al pulsar el botón físico, el ESP32 graba la sesión en la SD sin necesidad de app. Al conectar vía BLE, la app detecta sesiones pendientes y las importa al historial |
| ⬜ | Los datos viven en dos sitios: SD del sensor (fuente de verdad offline) y app (historial del usuario) |
| ⬜ | Mismo formato JSON de sesiones — sin cambios de esquema |

---

## Hardware

### Fase 1 — Prototipo *(actual)*
- ESP32 DevKit + GY-521 en breadboard
- Alimentación por USB
- Fijación al saco con bridas / cinta

### Fase 2 — Consolidación
- PCB personalizada: ESP32 + MPU-6050 en placa compacta
- Batería integrada con carga USB-C
- Interruptor on/off físico
- LEDs indicadores de estado (BLE, batería baja)
- Pruebas de durabilidad con uso real

### Fase 2.5 — Autonomía
- **Botón de acción**: pulsación corta → inicia sesión libre; segunda pulsación → finaliza y guarda en SD
- **Módulo micro SD**: graba sesiones en local — el usuario entrena sin app y luego importa los datos al conectar vía BLE

### Fase 3 — Producto
- Diseño de carcasa
- Impresión 3D / fabricación
- Fijación definitiva al saco: velcro, tornillos o integración en vendas
