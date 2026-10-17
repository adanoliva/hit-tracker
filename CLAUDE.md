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
| Mobile | `package.json` | 1.26.5 |

Las versiones siguen [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **PATCH** (`1.0.x`): corrección de bugs, ajustes menores sin features nuevas
- **MINOR** (`1.x.0`): feature nueva compatible con versiones anteriores
- **MAJOR** (`x.0.0`): cambio de arquitectura o ruptura de compatibilidad

**Regla**: cada vez que se haga un commit que añada funcionalidad o corrija un bug, actualizar la versión en `package.json`. La versión se actualiza en el mismo commit que el cambio, no en uno separado. Para mobile, también actualizar `app.json`.

**Regla (Google Play)**: antes de generar un `.aab` (`npm run android:bundle`), incrementar `versionCode` en `app.json` (`expo.android.versionCode`). Play Console rechaza subir un bundle con un `versionCode` ya usado.

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
├─ types/index.ts           Todos los tipos: Training, Round, Impact, Device, CalibrationProfile, WorkoutPlan...
├─ services/
│  ├─ calibration.ts        calibrationService (detección, intensidad)
│  ├─ training.ts           trainingService (singleton, gestiona rondas)
│  ├─ exercise.ts           exerciseService (catálogo base + importación desde wger API)
│  └─ migration.ts          migrationService (migra trainings legados)
├─ data/
│  ├─ exercises.json        Catálogo base de ejercicios
│  └─ routines.json         Rutinas predefinidas
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

- **`shared/services/`**: Lógica de negocio pura. `calibrationService`, `trainingService` (singleton con estado de la ronda activa), `exerciseService`, `migrationService`, `caloriesService`.
- **`hooks/`**: Puente entre servicios y UI. `useSensorData` procesa el stream raw y detecta picos. `useTraining` orquesta fases y timers de rondas/descansos. `useWorkoutPlayer` gestiona el player de ejercicios físicos.
- **`stores/`**: Estado global con Zustand. `deviceStore`, `profileStore`, `trainingStore`, `workoutPlanStore`, `customExerciseStore`.
- **`src/services/`**: `bleConnection`, `audio`, `storage`, `googleAuth` + `driveSync` (backup/restauración de sesiones y perfiles en Google Drive, ver `docs/GOOGLE-DRIVE-SETUP.md`).

### Modelo de datos principal

El modelo central es `Training { rounds: Round[] }`. Cada `Round` acumula `Impact[]` y genera `RoundStats` al finalizar.

### Detección de golpes (`useSensorData`)

```
SensorReading.magnitude = sqrt(ax² + ay² + az²)
V3/V4 (isPeak=true): impacto registrado directamente sin detección de pico
V2: pico detectado cuando magnitude baja tras superar dynamicFloor + cooldown transcurrido
Impact.intensity = clamp(0, 100, (magnitude - base) / range * 100)
  donde base = profile.threshold * 10, range = profile.sensitivity * 10
```

### Fases del entrenamiento (`useTraining`)

```
idle → preparing (10s) → round → resting → round → ... → finished
```

En modo libre (`roundDuration = 0`): el timer sube y el usuario termina la ronda manualmente.

### Persistencia

`expo-file-system`:
- `<documentDirectory>/HitTracker/trainings/training_<id>.json`
- `devices.json`, `profiles.json`, `workout_plans.json`, `custom_exercises.json`

### UI e iconos

- `StyleSheet` de React Native. Colores siempre desde `colors` en `src/theme.ts`.
- Iconos via `lucide-react-native`.
- Nunca usar emojis como iconos en la UI — usar Lucide en su lugar.
- El catálogo completo de iconos disponibles está en [lucide.dev](https://lucide.dev).

### Modal "Acerca de"

Existe en `Profiles/index.tsx`. Muestra versión, descripción del proyecto y enlace al repositorio. El botón `ⓘ` está fijo en la esquina inferior derecha de la pantalla de Perfiles.

## Skills

Skills a usar durante todo el ciclo de vida del proyecto, no solo al implementar una feature puntual. Invocar la que corresponda al tipo de tarea, en el momento indicado:

### Features nuevas (`/feature-spec` → `/dev` → `/qa` → `/doc`)

Ver [Flujo de desarrollo de features](#flujo-de-desarrollo-de-features) más abajo — cada paso de ese flujo es una skill.

### Migración a Clean Architecture / DDD

- **`migrate-context`** — checklist obligatorio al migrar cualquier bounded context (Training, Calibration, Device, WorkoutPlan, Sync) a la estructura por capas de `docs/PROPUESTA-CLEAN-ARCHITECTURE.md`. Usar de punta a punta en cada contexto, no solo como referencia — define el orden (domain → application → infrastructure → presentation) y qué no saltarse (tests, borrado de código viejo, actualización de imports).

### Calidad de código (usar antes de dar una tarea por terminada)

- **`ponytail:ponytail-review`** — revisión enfocada en sobre-ingeniería: interfaces con una sola implementación, abstracciones especulativas, código muerto. Imprescindible después de cada contexto migrado a Clean Architecture, donde el riesgo de meter capas de más es alto.
- **`simplify`** — pasada de simplificación/reuso sobre el diff antes de cerrarlo. Complementa a `ponytail-review` (esa caza sobre-ingeniería; esta, reuso y eficiencia).
- **`review`** o `/code-review` (`ultra` para multi-agente) — revisión de correctness del diff, como si fuera un PR. Usar en cualquier cambio no trivial, no solo en el refactor de arquitectura.
- **`security-review`** — obligatoria antes de tocar código de autenticación, tokens o sync con servicios externos (`googleAuth.ts`, `driveSync.ts`, el futuro contexto Sync).

### UI (mobile o web)

Al construir o modificar UI, usar estas skills instaladas, en este orden:

1. **`ui-ux-pro-max`** — para decidir estilo, paleta, tipografía, layout y patrones UX antes de implementar.
2. **`frontend-design`** — para que el resultado no se vea genérico/hecho por IA (evitar plantillas obvias, gradientes por defecto, espaciado descuidado).
3. Skills de **Emil Kowalski** (`animation-vocabulary`, `improve-animations`, `find-animation-opportunities`, `review-animations`, `apple-design`, `prototype`, `emil-design-eng`, `pick-ui-library`) — para animaciones y transiciones fluidas.
4. Skills de **Vercel** (`web-design-guidelines`, `vercel-react-best-practices`, `vercel-optimize`, `vercel-composition-patterns`) — para auditar el resultado final antes de darlo por terminado. `vercel-react-native-skills` aplica específicamente a mobile (listas, animaciones, módulos nativos).

### Documentación

- **`writing-guidelines`** — al escribir o revisar contenido de `docs/*.md`, para que la prosa sea consistente en voz y tono.

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

`.claude/` está en `.gitignore` — es local-only, no se trackea en el repo.

## Documentación

- `docs/ARQUITECTURA.md` — arquitectura general del sistema
- `docs/DOCUMENTO_TECNICO.md` — referencia técnica completa (tipos, hooks, stores, BLE, audio, build)
- `docs/FUNCIONAL.md` — documentación funcional (pantallas, flujos, conceptos para el usuario)
- `docs/ROADMAP.md` — estado y próximos pasos
- `docs/COLORES.md` — paleta de colores oficial
- `docs/GUIA-CONEXION-V1.md` — esquema de conexión hardware (ESP32 + batería + LEDs)
- `docs/GOOGLE-DRIVE-SETUP.md` — creación de credenciales OAuth2 para el backup en Google Drive
- `docs/SENSOR-TECNICO-V*.md` — referencia técnica de cada versión de firmware ESP32
- `.claude/FEATURES.md` — índice de features y su estado
- `.claude/features/` — specs técnicas de cada feature
