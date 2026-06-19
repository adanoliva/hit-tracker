# Roadmap — Hit Tracker

## Software

### V1 — Base *(casi listo)* — primer producto demostrable
- Detección de golpes en tiempo real via BLE
- Sesiones con rondas, descansos y modo libre
- Dashboard con historial y progreso
- Perfiles de usuario y calibración manual
- App desktop (Windows) + app mobile (Android)
- Sensor ESP32 conectado via BLE en desktop y mobile
- Eliminación de modos de prueba (mock y teléfono como sensor)

> Con V1 completo y el sensor físico (Fase 1 hardware) ya hay un producto real y demostrable, aunque el sensor sea un ESP32 con cables pegado al saco.

### V2 — Precisión
- Modo calibración guiado (series de golpes ligero / normal / fuerte)
- % de valid hits configurable por perfil
- Conexión BLE con sensor ESP32 en mobile
- Haptics en golpes válidos (mobile)
- **Nombre de dispositivo personalizado**: el usuario define `DEVICE_NAME` en el firmware antes de flashear — aparece en la lista de sensores de la app para identificar cada saco
- **PIN de emparejamiento BLE**: el usuario define `BLE_PIN` en el firmware — solo dispositivos que lo conozcan pueden conectar al sensor

### V3 — Entrenamiento
- Sección Entrenamiento físico: rutinas de calentamiento, core y fullbody
- Multi-sensor / multi-usuario: sesión de grupo con vista en tiempo real por usuario

### V4 — Portabilidad de datos
- **Versión de hardware**: al conectar, la app lee la versión del sensor (1/2/3) vía BLE y adapta la UI — por ejemplo, solo muestra "Recuperar sesiones del sensor" si el hardware es V3
- **Sesión autónoma desde el sensor**: al pulsar el botón físico, el ESP32 graba la sesión en la SD sin necesidad de app. Al conectar vía BLE, la app detecta sesiones pendientes y las importa al historial
- Los datos viven en dos sitios: SD del sensor (fuente de verdad offline) y app (historial del usuario)
- **Sincronización en la nube** *(complemento)*: sesiones, perfiles y calibración vía la cuenta del propio usuario — sin servidores propios
  - Android + Desktop: Google Drive (carpeta `HitTracker/` en el Drive del usuario)
  - iOS *(cuando llegue)*: iCloud Drive o Google Drive
- Mismo formato JSON de sesiones — sin cambios de esquema

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
