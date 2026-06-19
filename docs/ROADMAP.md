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

### V3 — Entrenamiento
- Modo Combos: secuencias predefinidas con validación de timing e intensidad
- Sección Entrenamiento físico: rutinas de calentamiento, core y fullbody
- Multi-sensor / multi-usuario: sesión de grupo con vista en tiempo real por usuario

---

## Hardware

### Fase 1 — Prototipo *(actual)*
- ESP32 DevKit + GY-521 en breadboard
- Alimentación por USB
- Fijación al saco con bridas / cinta

### Fase 2 — Consolidación
- PCB personalizada: ESP32 + MPU-6050 en placa compacta
- Batería integrada con carga USB-C
- Pruebas de durabilidad con uso real

### Fase 3 — Producto
- Diseño de carcasa
- Impresión 3D / fabricación
- Fijación definitiva al saco: velcro, tornillos o integración en vendas
