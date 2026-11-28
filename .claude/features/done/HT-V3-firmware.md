# HT-V3: Firmware V3 — Detección de golpes en sensor + sincronización de perfil via BLE

## Resumen

Migración de la detección de golpes desde la app al firmware ESP32. El sensor pasa de hacer streaming continuo (V2) a enviar solo eventos de golpe. La app sincroniza los parámetros del perfil activo al sensor via BLE Write.

## Archivos implementados

### Nuevo
- `FIRMWARE/HitTracker_V3/HitTracker_V3.ino`

### Modificados
- `shared/types/index.ts` — `SensorReading.isPeak?: boolean`
- `src/services/bleConnection.ts` — parseV3, sendProfileConfig, getSensorVersion, CONFIG_UUID
- `src/core/hooks/useSensorData.ts` — path rápido para readings con isPeak=true
- `src/components/Profiles/index.tsx` — botón Sync, auto-sync on connect + profile change
- `package.json` + `app.json` — v1.11.0

## Protocolo BLE V3

**NOTIFY (hit event, 6 bytes):**
```
uint32 timestamp    // ms desde boot del sensor
uint16 magnitude    // sqrt(ax²+ay²+az²) en raw/16
```

**WRITE (config, 4 bytes):**
```
uint16 threshold_raw  // profile.threshold * 10
uint16 cooldown_ms    // profile.rebound ?? 400
```

## Comportamiento

- Firmware detecta golpes con el mismo algoritmo que V2 (dynamic floor, cooldown)
- Config persiste en NVS (Preferences) — sobrevive a reinicios
- App envía config al conectar y cada vez que cambia el perfil activo
- Botón "Sync" manual en la tarjeta del perfil activo (visible solo con V3)
- `useSensorData`: si `reading.isPeak === true`, omite detección de pico y registra el impacto directamente
