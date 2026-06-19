# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. Existe en dos plataformas:

- **Desktop** (`src/`): Electron + React + TypeScript
- **Mobile** (`mobile/`): React Native + Expo (Android)
- **Shared** (`shared/`): Tipos e servicios comunes a ambas plataformas

El hardware consiste en un ESP32 + GY-521 (MPU-6050) que transmite datos de acelerómetro/giroscopio via Bluetooth BLE. En mobile también existe el modo "Todo en 1" donde el propio móvil actúa como sensor (sin ESP32).

## Convención de plataformas

**Toda mejora o feature se aplica a DESKTOP y MOBILE salvo que se indique explícitamente lo contrario.**

Cuando una feature sea exclusiva de una plataforma, indicarlo así:
- `[solo desktop]` — solo aplica a `src/`
- `[solo mobile]` — solo aplica a `mobile/`

## Versiones

| Plataforma | Archivo | Versión actual |
|---|---|---|
| Desktop | `package.json` | 1.0.0 |
| Mobile | `mobile/package.json` | 1.0.0 |

Las versiones siguen [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **PATCH** (`1.0.x`): corrección de bugs, ajustes menores sin features nuevas
- **MINOR** (`1.x.0`): feature nueva compatible con versiones anteriores
- **MAJOR** (`x.0.0`): cambio de arquitectura o ruptura de compatibilidad

**Regla**: cada vez que se haga un commit que añada funcionalidad o corrija un bug, actualizar la versión en `package.json` (Desktop) y/o `mobile/package.json` (Mobile) según corresponda. La versión se actualiza en el mismo commit que el cambio, no en uno separado.

## Comandos

### Desktop
```bash
npm run dev       # Desarrollo (electron-vite dev)
npm run build     # Build completo
npm run pack      # Genera ejecutable sin publicar
npm run release   # Build + publica
```

### Mobile
```bash
cd mobile
npm run start     # expo start
npm run android   # expo run:android
```

Firmware ESP32: Arduino IDE 2.0+, board "ESP32 DevKit C", upload speed 921600, serial monitor 115200 baud.

## Arquitectura

### Código compartido (`shared/`)

Los tipos del dominio y los servicios de negocio son comunes a desktop y mobile:

```
shared/
├─ types/index.ts           Todos los tipos: Training, Round, Impact, Device, CalibrationProfile...
└─ services/
   ├─ calibration.ts        calibrationService (detección, intensidad)
   └─ training.ts           trainingService (singleton, gestiona rondas)
```

Los archivos locales de cada plataforma son **re-exports** de `@shared`:
- `src/renderer/src/types/index.ts` → `export * from '@shared/types'`
- `src/renderer/src/services/calibration.ts` → re-export
- `mobile/src/core/types/index.ts` → re-export
- etc.

El alias `@shared/*` está configurado en:
- Desktop: `tsconfig.web.json` + `electron.vite.config.ts`
- Mobile: `tsconfig.json` + `metro.config.js`

### Proceso Electron (Main ↔ Renderer)

La comunicación entre main process y React UI va por IPC. El preload expone `window.api` con handlers para file system. **No usar `fs` directamente desde React** — todo pasa por `window.api`.

### Capas de la app

```
Sensor (BLE/móvil) → useSensorData() → useTraining() → trainingStore → UI
```

- **`shared/services/`**: Lógica de negocio pura. `calibrationService`, `trainingService` (singleton con estado de la ronda activa).
- **`hooks/`**: Puente entre servicios y UI. `useSensorData` procesa el stream raw y detecta picos. `useTraining` orquesta fases y timers de rondas/descansos.
- **`stores/`**: Estado global con Zustand. `deviceStore`, `profileStore`, `trainingStore`.

### Modelo de datos principal

El modelo central es `Training { rounds: Round[] }`. Cada `Round` acumula `Impact[]` y genera `RoundStats` al finalizar.

### Detección de golpes (`useSensorData`)

```
SensorReading.magnitude = sqrt(ax² + ay² + az²)
Pico detectado cuando: magnitude baja después de superar threshold (cooldown 200ms)
Impact.intensity = clamp(0, 100, (magnitude - threshold) * sensitivity)
Impact.isValid = intensity >= powerMax * 0.8
```

### Fases del entrenamiento (`useTraining`)

```
idle → preparing (10s) → round → resting → round → ... → finished
```

En modo libre (`roundDuration = 0`): el timer sube y el usuario termina la ronda manualmente.

### Persistencia

**Desktop** — Archivos JSON via IPC (`window.api`):
- `<userData>/HitTracker/trainings/<id>.json`
- `devices.json`, `profiles.json`, `app-config.json`

**Mobile** — `expo-file-system`:
- `<documentDirectory>/HitTracker/trainings/training_<id>.json`
- `devices.json`, `profiles.json`

## Documentación

- `docs/ARQUITECTURA.md` — arquitectura general del sistema
- `docs/DOCUMENTO_TECNICO.md` — referencia técnica completa (tipos, hooks, stores, IPC API)
- `docs/ROADMAP.md` — estado y próximos pasos
- `docs/SENSOR-TECNICO-V*.md` — versiones del hardware ESP32
