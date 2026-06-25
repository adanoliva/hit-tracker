# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real.

- **Mobile** (raíz `/`): React Native + Expo (Android) — plataforma activa
- **Desktop** (`desktop/`): Tauri 2 + React + TypeScript — archivado (tag `desktop-freeze`)
- **Shared** (`shared/`): Tipos y servicios comunes

El hardware consiste en un ESP32 + GY-521 (MPU-6050) que transmite datos de acelerómetro/giroscopio via Bluetooth BLE.

## Versiones

| Plataforma | Archivo | Versión actual |
|---|---|---|
| Mobile | `package.json` | 1.9.0 |

Las versiones siguen [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **PATCH** (`1.0.x`): corrección de bugs, ajustes menores sin features nuevas
- **MINOR** (`1.x.0`): feature nueva compatible con versiones anteriores
- **MAJOR** (`x.0.0`): cambio de arquitectura o ruptura de compatibilidad

**Regla**: cada vez que se haga un commit que añada funcionalidad o corrija un bug, actualizar la versión en `package.json`. La versión se actualiza en el mismo commit que el cambio, no en uno separado. Para mobile, también actualizar `app.json`.

## Comandos

```bash
npm run start     # expo start
npm run android   # expo run:android
npm run test      # Jest — tests unitarios de lógica de negocio
```

Firmware ESP32: Arduino IDE 2.0+, board "ESP32 DevKit C", upload speed 921600, serial monitor 115200 baud.

## Arquitectura

### Código compartido (`shared/`)

Los tipos del dominio y los servicios de negocio están en:

```
shared/
├─ types/index.ts           Todos los tipos: Training, Round, Impact, Device, CalibrationProfile...
├─ services/
│  ├─ calibration.ts        calibrationService (detección, intensidad)
│  └─ training.ts           trainingService (singleton, gestiona rondas)
└─ __tests__/               Tests Jest de lógica compartida
```

Los archivos locales son **re-exports** de `@shared`:
- `src/core/types/index.ts` → re-export
- etc.

El alias `@shared/*` está configurado en `tsconfig.json` + `metro.config.js`.

### Capas de la app

```
Sensor (BLE) → useSensorData() → useTraining() → trainingStore → UI
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

`expo-file-system`:
- `<documentDirectory>/HitTracker/trainings/training_<id>.json`
- `devices.json`, `profiles.json`

### UI e iconos

- `StyleSheet` de React Native. Colores siempre desde `colors` en `src/theme.ts`.
- Iconos via `lucide-react-native`.
- Nunca usar emojis como iconos en la UI — usar Lucide en su lugar.
- El catálogo completo de iconos disponibles está en [lucide.dev](https://lucide.dev).

### Modal "Acerca de"

Existe en `Profiles/index.tsx`. Muestra versión, descripción del proyecto y enlace al repositorio. El botón `ⓘ` está fijo en la esquina inferior derecha de la pantalla de Perfiles.

## Tests

Los tests usan **Jest + ts-jest** y cubren únicamente lógica de negocio pura (servicios y hooks puros). No se testean componentes React Native.

Directorios de tests:
- `shared/__tests__/` — lógica compartida (calibrationService, trainingService)
- `src/__tests__/` — lógica exclusiva de mobile

Convención de nombre: `HT-XXX.test.ts` para tests asociados a una feature, `<nombre>.test.ts` para tests de servicios existentes.

## Flujo de desarrollo de features

Las features se definen, implementan y documentan mediante un flujo de agentes:

```
/feature-spec  →  /dev HT-XXX  →  /qa HT-XXX  →  /doc HT-XXX
```

- **`.claude/features/pending/`** — specs listas para implementar
- **`.claude/features/in-progress/`** — en desarrollo
- **`.claude/features/done/`** — completadas, testeadas y documentadas
- **`.claude/FEATURES.md`** — índice con estado de todas las features

Los agentes usan el ID de feature (ej. `HT-001`) para localizar el archivo. Si no existe, no continúan.

## Documentación

- `docs/ARQUITECTURA.md` — arquitectura general del sistema
- `docs/DOCUMENTO_TECNICO.md` — referencia técnica completa (tipos, hooks, stores, IPC API)
- `docs/ROADMAP.md` — estado y próximos pasos
- `docs/SENSOR-TECNICO-V*.md` — versiones del hardware ESP32
- `.claude/FEATURES.md` — índice de features y su estado
- `.claude/features/` — specs técnicas de cada feature
