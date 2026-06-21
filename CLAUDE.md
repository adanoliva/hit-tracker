# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. Existe en dos plataformas:

- **Desktop** (`src/`): Tauri 2 + React + TypeScript + Tailwind CSS
- **Mobile** (`mobile/`): React Native + Expo (Android)
- **Shared** (`shared/`): Tipos y servicios comunes a ambas plataformas

El hardware consiste en un ESP32 + GY-521 (MPU-6050) que transmite datos de acelerómetro/giroscopio via Bluetooth BLE.

> **Nota temporal**: en mobile existe el modo "Todo en 1" donde el propio móvil actúa como sensor (`usePhoneSensor`, `PHONE_SENSOR_ID`). Esta implementación se eliminará cuando el sensor ESP32 físico esté disponible y probado.

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
npm run dev       # Desarrollo (tauri dev)
npm run build     # Build completo (tauri build)
npm run test      # Jest — tests unitarios de lógica de negocio
```

### Mobile
```bash
cd mobile
npm run start     # expo start
npm run android   # expo run:android
npm run test      # Jest — tests unitarios de lógica de negocio
```

Firmware ESP32: Arduino IDE 2.0+, board "ESP32 DevKit C", upload speed 921600, serial monitor 115200 baud.

## Arquitectura

### Código compartido (`shared/`)

Los tipos del dominio y los servicios de negocio son comunes a desktop y mobile:

```
shared/
├─ types/index.ts           Todos los tipos: Training, Round, Impact, Device, CalibrationProfile...
├─ services/
│  ├─ calibration.ts        calibrationService (detección, intensidad)
│  └─ training.ts           trainingService (singleton, gestiona rondas)
└─ __tests__/               Tests Jest de lógica compartida
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

### UI e iconos

- **Desktop**: Tailwind CSS para estilos. Iconos via `lucide-react`.
- **Mobile**: `StyleSheet` de React Native. Colores siempre desde `colors` en `mobile/src/theme.ts`. Iconos via `lucide-react-native`.
- Nunca usar emojis como iconos en la UI — usar Lucide en su lugar.
- El catálogo completo de iconos disponibles está en [lucide.dev](https://lucide.dev).

### Modal "Acerca de"

Existe en `Profiles/index.tsx` (desktop y mobile). Muestra versión, descripción del proyecto y enlace al repositorio. El botón `ⓘ` está fijo en la esquina inferior derecha de la pantalla de Perfiles.

## Tests

Los tests usan **Jest + ts-jest** y cubren únicamente lógica de negocio pura (servicios y hooks puros). No se testean componentes React/React Native.

Directorios de tests:
- `shared/__tests__/` — lógica compartida (calibrationService, trainingService)
- `src/renderer/src/__tests__/` — lógica exclusiva de desktop
- `mobile/src/__tests__/` — lógica exclusiva de mobile

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
