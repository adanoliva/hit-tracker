# HIT TRACKER — Documento Técnico

## Descripción General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. La plataforma activa es la app móvil Android (React Native + Expo). La lógica de negocio y los tipos viven en `shared/` y se importan con el alias `@shared`.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Expo SDK | 56 |
| UI | React Native | 0.85 |
| Lenguaje | TypeScript | 6 |
| Iconos | lucide-react-native | 1.21 |
| Estado | Zustand | 5 |
| Navegación | React Navigation (native + bottom-tabs) | 7 |
| BLE | react-native-ble-plx | 3 |
| Audio | expo-audio | 56 |
| Persistencia | expo-file-system | 56 |
| Gráficos | react-native-svg | 15 |
| Captura de vista | react-native-view-shot | 5 |
| Share nativo | expo-sharing | 56 |
| Pantalla activa | expo-keep-awake | 56 |
| Tests | Jest + ts-jest | 30 / 29 |

---

## Estructura de Carpetas

```
hit-tracker/                         ← raíz = app mobile
│
├─ shared/                           ← Código común (alias @shared)
│  ├─ types/index.ts                 Todos los tipos del dominio
│  ├─ services/
│  │  ├─ calibration.ts              calibrationService
│  │  ├─ training.ts                 trainingService (singleton)
│  │  ├─ exercise.ts                 exerciseService (catálogo base)
│  │  └─ migration.ts                migrationService (migra trainings legados)
│  ├─ data/
│  │  ├─ exercises.json              Catálogo base de ejercicios
│  │  └─ routines.json               Rutinas predefinidas
│  ├─ constants.ts                   APP_VERSION, RAW16_FACTOR
│  └─ __tests__/                     Tests unitarios de lógica compartida
│
├─ src/
│  ├─ core/
│  │  ├─ types/index.ts              → re-export @shared/types
│  │  ├─ services/
│  │  │  ├─ calibration.ts           → re-export @shared/services/calibration
│  │  │  ├─ trainingService.ts       → re-export @shared/services/training
│  │  │  ├─ exerciseService.ts       getAll(), getById(), getByCategory()
│  │  │  └─ wgerService.ts           Búsqueda e importación desde wger API
│  │  ├─ hooks/
│  │  │  ├─ useSensorData.ts         Detección de golpes, cálculo HPM
│  │  │  ├─ useTraining.ts           Orquesta fases y timers de rondas/descansos
│  │  │  ├─ useBleReading.ts         Suscribe lecturas BLE al callback activo
│  │  │  └─ useWorkoutPlayer.ts      Máquina de estados del player de ejercicios físicos
│  │  └─ stores/
│  │     ├─ deviceStore.ts
│  │     ├─ profileStore.ts
│  │     ├─ trainingStore.ts
│  │     ├─ workoutPlanStore.ts
│  │     └─ customExerciseStore.ts
│  │
│  ├─ hooks/
│  │  ├─ useShareSession.ts          Captura PNG + share sheet nativo
│  │  └─ useLayout.ts
│  │
│  ├─ services/
│  │  ├─ audio.ts                    expo-audio: oneBell/twoBell/threeBell, beep, countdownTick/countdownEnd
│  │  ├─ ble.ts                      BleManager singleton (react-native-ble-plx)
│  │  ├─ bleConnection.ts            connect/disconnect/parse/sendProfileConfig
│  │  └─ storage.ts                  expo-file-system (legacy API)
│  │
│  ├─ navigation/
│  │  ├─ MobileLayout.tsx            BottomTabNavigator (5 tabs)
│  │  └─ TabletLayout.tsx
│  │
│  ├─ components/
│  │  ├─ Dashboard/index.tsx
│  │  ├─ Devices/index.tsx
│  │  ├─ Session/                    ← Sesión de boxeo directa
│  │  │  ├─ index.tsx (TrainingPage)
│  │  │  ├─ TrainingSetup.tsx
│  │  │  ├─ TrainingRound.tsx
│  │  │  ├─ TrainingRest.tsx
│  │  │  └─ TrainingResults.tsx
│  │  ├─ PlanRunner/                 ← Módulo Entrenamiento
│  │  │  ├─ index.tsx (EntrenamientoPage)
│  │  │  ├─ PlanRunner.tsx
│  │  │  ├─ PlanBuilder.tsx
│  │  │  ├─ PlanCard.tsx
│  │  │  ├─ CatalogScreen.tsx
│  │  │  ├─ WgerSearchScreen.tsx
│  │  │  ├─ ExerciseSelector.tsx
│  │  │  ├─ BoxingConfigSection.tsx
│  │  │  ├─ RoundComboEditor.tsx
│  │  │  ├─ ExerciseDetailSheet.tsx
│  │  │  └─ BoxingExerciseForm.tsx
│  │  ├─ Profiles/index.tsx
│  │  ├─ SessionDetail/index.tsx
│  │  └─ Workout/WorkoutPlayer.tsx
│  │
│  ├─ utils/shareText.ts
│  └─ theme.ts                       Paleta de colores
│
├─ App.tsx                           Entry point: init, navegación
├─ metro.config.js                   watchFolders + extraNodeModules para @shared
├─ tsconfig.json                     paths: @shared/* → ./shared/*
├─ web/index.html                    Landing page marketing (hit-tracker.es)
├─ FIRMWARE/                         Firmware ESP32 (V1/V2/V3)
└─ docs/
```

---

## Constantes (`shared/constants.ts`)

```typescript
APP_VERSION = '1.10.2'   // versión embebida en Training.appVersion al finalizar sesión
RAW16_FACTOR = 13.06     // factor de conversión m/s² → raw/16 (uso diagnóstico)
```

> **Nota**: `APP_VERSION` en `constants.ts` es independiente de la versión en `package.json`/`app.json`. La de `constants.ts` identifica el formato del fichero de sesión guardado (para migraciones); la de `package.json` es la versión de la app publicada.

---

## Tipos del Dominio (`shared/types/index.ts`)

```typescript
interface SensorReading {
  timestamp: number    // ms epoch
  ax: number           // aceleración X — raw ±16g (1g ≈ 128); V3: 0
  ay: number           // Y; V3: 0
  az: number           // Z; V3: 0
  gx: number           // giroscopio X; V3: 0
  gy: number           // Y; V3: 0
  gz: number           // Z; V3: 0
  magnitude: number    // sqrt(ax²+ay²+az²); reposo ≈ 128, golpe suave 400-700+
  isPeak?: boolean     // V3: true — firmware ya confirmó este evento como golpe
}

interface Impact {
  time: number         // timestamp del golpe (ms epoch)
  intensity: number    // 0-100 (calculado con calibrationService)
  magnitude: number    // raw del pico
  duration: number     // ms (actualmente 0, reservado)
}

interface Device {
  mac: string
  name: string
  createdAt: number
  lastSeen: number
  isConnected?: boolean
}

interface HitWindow {
  peak: number         // magnitud del pico detectado (raw)
  rebound: number      // ms desde el pico hasta que la señal se asienta
  reboundMax: number   // magnitud máxima durante la fase de rebote
}

interface CalibrationProfile {
  id: string
  name: string
  threshold: number    // base de detección en raw/10; base = threshold×10 (default 15.0)
  sensitivity: number  // escala de intensidad en raw/10; range = sensitivity×10 (default 25.0)
  rebound?: number     // cooldown personalizado en ms (del wizard); si ausente → fórmula dinámica
  calibrationData?: {
    calibratedAt: number
    samples: { light: number[]; normal: number[]; heavy: number[] }
  }
  createdAt: number
}

interface RoundStats {
  duration: number       // ms de la ronda
  totalImpacts: number
  powerMax: number       // magnitud raw del golpe más fuerte
  hpmAverage: number     // golpes/minuto promedio de la ronda
  hpmMax: number         // HPM pico en ventana de 10s
  powerTrend: number[]   // magnitud raw de cada golpe en orden cronológico
  isFatigued: boolean    // 2ª mitad de golpes < 1ª mitad × 0.85 (potencia)
  isCadenceDropped: boolean // 2ª mitad de la ronda (por tiempo) < 70% del ritmo de la 1ª mitad (golpes/ms)
}

interface Round {
  number: number
  startTime: number
  endTime: number
  impacts: Impact[]
  stats: RoundStats
}

interface Training {
  id: string              // "training-<ISO-datetime>"
  appVersion?: string     // valor de APP_VERSION al finalizar
  createdAt: number
  device: { mac: string; name: string }   // snapshot
  profile: CalibrationProfile             // snapshot
  rounds: Round[]
  roundDuration: number   // segundos (0 = modo libre)
  numRounds: number
  restDuration: number    // segundos
  totalImpacts: number    // suma de todas las rondas
  powerMax: number        // máximo global
  hpmAverage: number      // promedio global
}

type ExerciseCategory = 'warmup' | 'core' | 'upper' | 'lower' | 'fullbody' | 'mobility' | 'boxing'

interface Exercise {
  id: string              // base: slug; custom: "custom-<slug>-<ts>"; wger: "wger-<id>"
  name: string
  category: ExerciseCategory
  muscles: string[]
  equipment: 'none' | 'dumbbells' | 'pull-up-bar'
  description: string
  imageUrl?: string
  duration?: number       // segundos (undefined → basado en reps)
  reps?: number
  rest: number            // segundos entre series
  difficulty: 'easy' | 'medium' | 'hard'
}

interface BoxingRoundScript {
  round: number           // 1-based
  combo: string           // notación libre: "1-2-3-Slip Iz-3b-6"
  note?: string
}

interface BoxingPhaseConfig {
  roundDuration: number   // segundos (0 = modo libre)
  numRounds: number
  restDuration: number
  roundScripts: BoxingRoundScript[]   // sparse — puede tener menos entradas que numRounds
}

interface WorkoutPlan {
  id: string              // "plan-<timestamp>"
  name: string
  createdAt: number
  warmupExerciseIds: string[]
  coreExerciseIds: string[]
  boxing: BoxingPhaseConfig
}
```

---

## Servicios Compartidos

### `calibrationService` (`shared/services/calibration.ts`)

```typescript
calibrationService.createProfile(name: string): CalibrationProfile
// id: `profile-${Date.now()}`, threshold: 15.0, sensitivity: 25.0

calibrationService.analyzeCalibrationWindows(
  light: HitWindow[],
  heavy: HitWindow[]
): { suggestedThreshold: number; suggestedSensitivity: number; suggestedRebound: number } | null
// lightAvg = avg(light.map(w => w.peak))
// heavyAvg = avg(heavy.map(w => w.peak))
// base = lightAvg * 0.8
// range = heavyAvg - base
// → null si range < base * 0.2 (no hay suficiente diferencia entre light y heavy)
// threshold = clamp(0, 100,  round(base/10  * 10)/10)
// sensitivity = clamp(1, 100, round(range/10 * 10)/10)
// rebound = clamp(200, 700, max(all windows rebound) + 80)

calibrationService.calculateIntensity(magnitude: number, profile: CalibrationProfile): number
// base  = profile.threshold  * 10   (raw units)
// range = profile.sensitivity * 10   (raw units)
// → clamp(0, 100, round((magnitude - base) / range * 100))
```

### `trainingService` (`shared/services/training.ts`)

Singleton exportado como `trainingService` (instancia de clase `TrainingService`).

```typescript
trainingService.startTraining(config: {
  device: Device,
  profile: CalibrationProfile,
  roundDuration: number,
  numRounds: number,
  restDuration: number
}): Training

trainingService.startRound(roundNumber: number): void
trainingService.onImpactDetected(impact: Impact): void
trainingService.finishRound(): Round | null          // calcula RoundStats y hace push a rounds[]
trainingService.finishTraining(): Training | null    // agrega totalImpacts, powerMax, hpmAverage, appVersion
trainingService.getCurrentTraining(): Training | null
trainingService.getCurrentRoundImpacts(): Impact[]
trainingService.getPreviousRoundStats(roundNumber: number): RoundStats | null
```

`calcRoundStats` interno:
- `isFatigued`: promedio magnitud 2ª mitad de impacts < promedio 1ª mitad × 0.85 — partición **por índice** de golpe.
- `isCadenceDropped`: ritmo (golpes/ms) de la 2ª mitad de la ronda < 70% del ritmo de la 1ª mitad — partición **por tiempo**, no por índice (para no sesgar la medición si el ritmo ya varía dentro de la ronda). El punto medio se ancla en `impacts[0].time`, no en `round.startTime`, porque `Impact.time` usa el reloj del sensor BLE (`millis()` del ESP32) mientras que `round.startTime`/`endTime` usan `Date.now()` — son relojes distintos. Requiere un mínimo de 4 golpes en la 1ª mitad y 2 en la 2ª para evaluarse; si no se cumple, queda en `false`. Señal independiente de `isFatigued` (potencia vs. volumen), ambas pueden darse juntas, por separado o ninguna.

### `exerciseService` (`shared/services/exercise.ts`)

```typescript
exerciseService.getAll(): Exercise[]
exerciseService.getById(id: string): Exercise | undefined
exerciseService.getByCategory(category: ExerciseCategory): Exercise[]
```

Devuelve únicamente los ejercicios del catálogo base (`shared/data/exercises.json`). Los custom se gestionan en `customExerciseStore`.

### `migrationService` (`shared/services/migration.ts`)

```typescript
migrationService.migrate(trainings: Training[]): Training[]
// Retorna los trainings con campos normalizados a la versión actual del modelo.
// Se ejecuta al arrancar la app (App.tsx) sobre los trainings cargados desde disco.
```

---

## Hooks Personalizados

### `useSensorData`

`src/core/hooks/useSensorData.ts`

```typescript
function useSensorData(profile: CalibrationProfile): {
  impacts: Impact[]
  powerMax: number
  powerMaxMag: number       // magnitud raw del golpe más fuerte
  hpmStats: { current: number; average: number }
  processReading: (reading: SensorReading) => Impact | null
  reset: () => void
}
```

**Algoritmo de detección:**

```
SensorReading recibido
    │
    ├─ reading.isPeak === true (firmware V3)
    │    └─ registra impacto con reading.magnitude directamente
    │
    └─ sin isPeak (V2/V1)
         1. dynamicFloor decae exponencialmente hacia base (threshold×10):
              lambda = -ln(0.05) / effectiveRebound
              dynamicFloor = base + (dynamicFloor - base) × e^(-lambda × Δt)
         2. isPeak = !isRising && prevMag > dynamicFloor && Δt > cooldown
         3. effectiveRebound = cooldown = profile.rebound   (si viene del wizard)
                              ?? 200 + lastPeakMag × 0.3    (dinámico por magnitud)
         4. Al detectar pico: dynamicFloor = max(base, peak × 0.4)

    intensity = calculateIntensity(magnitude, profile)  → 0-100
```

**HPM:**
- `current`: golpes en últimos 10s × 6
- `average`: total golpes / minutos transcurridos

El **cooldown dinámico** escala con la fuerza del golpe para cubrir rebotes más largos en golpes fuertes. Si el perfil tiene `rebound` del wizard, ese valor tiene prioridad sobre la fórmula. Este mismo `effectiveRebound` (cooldown) es también la única fuente de verdad para el decaimiento del `dynamicFloor` — no hay una segunda constante de amortiguación independiente.

El **dynamicFloor** sube al 40% del pico al golpear y decae exponencialmente hacia base: `lambda` se deriva de `effectiveRebound` de forma que a los `effectiveRebound` ms el floor ha recuperado el 95% del camino hacia base. Cae rápido al principio (justo cuando la vibración del saco es más violenta) y se suaviza al acercarse a base, dejando más margen que el decaimiento lineal anterior para detectar combos rápidos y potentes sin bloquear golpes ligeros que llegan poco después de uno fuerte.

---

### `useTraining`

`src/core/hooks/useTraining.ts`

```typescript
type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

function useTraining(): {
  phase: TrainingPhase
  currentRoundNumber: number
  totalRounds: number
  roundTimeRemaining: number    // segundos — cuenta atrás (modo normal)
  roundTimeElapsed: number      // segundos — cuenta arriba (modo libre)
  restTimeRemaining: number
  prepTimeRemaining: number     // 10s fijos
  completedRounds: Round[]
  finishedTraining: Training | null
  isFreeMode: boolean           // roundDuration === 0
  startTraining(device: Device, profile: CalibrationProfile, roundDuration: number, numRounds: number, restDuration: number): void
  abortTraining(): void
  finishCurrentRound(): void    // termina ronda manualmente (solo modo libre)
  getPreviousRoundStats(): RoundStats | null
}
```

**Transiciones de fase:**

```
idle
  → preparing  al llamar startTraining()   [timer 10s; beep en 3s/2s/1s]
  → round      timer llega a 0             [trainingService.startRound(1); oneBell]
  → resting    timer llega a 0             [trainingService.finishRound(); twoBell]
  → round      timer llega a 0             [trainingService.startRound(n+1); oneBell]
  → finished   última ronda termina        [trainingService.finishTraining(); threeBell]
```

Sincroniza `activePhase` en `trainingStore` al cambiar de fase para bloquear la navegación durante la sesión.

Al llamar `startTraining()` también se activa `audioService.enableDucking()` una única vez por sesión (`setAudioModeAsync` con `interruptionMode: 'duckOthers'`), para que la música externa (Spotify, etc.) baje de volumen durante los avisos sonoros en vez de mezclarse o silenciarse.

**Aviso sonoro al superar el máximo histórico:** `Session/index.tsx` y `PlanRunner.tsx` calculan `userPowerRef` una sola vez al montar (`getUserPowerMax(profile.id)`). En el efecto que procesa cada `Impact` nuevo, si `userPowerRef.current > 0 && impact.magnitude > userPowerRef.current` se dispara `audioService.beep()`. Sin cooldown adicional — si se encadenan varios golpes que superan el máximo, suena en cada uno.

---

### `useWorkoutPlayer`

`src/core/hooks/useWorkoutPlayer.ts`

```typescript
interface ResolvedRoutine {
  name: string
  exercises: (Exercise & { sets?: number })[]
}

function useWorkoutPlayer(
  routine: ResolvedRoutine,
  onComplete: () => void,
  onAbort: () => void
): {
  currentExercise: Exercise | null
  phase: 'exercise' | 'rest'
  timeLeft: number | null        // null si el ejercicio es por reps (sin duration)
  setIndex: number               // serie actual (0-based)
  totalSets: number
  progress: number               // 0-1 dentro del ejercicio/descanso actual
  skipped: boolean
  isDone: boolean
  advance(): void                // avanza al siguiente ejercicio o descanso
  skip(): void                   // salta el ejercicio o descanso actual
  abort(): void                  // llama onAbort()
}
```

Máquina de estados: `exercise ↔ rest`. Countdown automático con `setInterval`. Auto-advance cuando `timeLeft` llega a 0. Para ejercicios por reps (`duration` ausente), `timeLeft=null` y el usuario avanza manualmente con `advance()`.

---

### `useBleReading`

`src/core/hooks/useBleReading.ts`

```typescript
function useBleReading(options: {
  deviceId: string | null
  active: boolean
  onReading: (reading: SensorReading) => void
}): void
```

Llama a `bleConnection.connectBleDevice(deviceId, callback)` cuando `active=true` y hay `deviceId`. Se desactiva automáticamente al desmontar o cuando `active` cambia a `false`. Usa ref interno para `onReading` y evitar closures stale.

---

### `useShareSession`

`src/hooks/useShareSession.ts`

```typescript
function useShareSession(options: {
  training: Training
  chartRef: React.RefObject<View | null>
}): {
  share: () => Promise<void>
  isSharing: boolean
}
```

1. Captura `chartRef` como PNG con `react-native-view-shot` → `cacheDirectory/hit-tracker-share.png`
2. Abre share sheet nativo vía `expo-sharing`
3. Fallback si falla la captura: `Share.share({ message: text })` (solo texto)

Texto generado por `generateShareText(training)`:
```
¡Vaya sesión! {X} min y una media de {Y} HPM. ¡A tope! 💪
#hittracker #boxing #training
```

---

## Stores (Zustand)

### `deviceStore`

```typescript
{
  devices: Device[]
  connected: Device | null
  setDevices(devices: Device[]): void
  addDevice(device: Device): void
  updateDevice(mac: string, updates: Partial<Device>): void
  removeDevice(mac: string): void
  setConnected(mac: string | null): void
  persist(): void    // storage.saveDevices()
}
```

### `profileStore`

Incluye un `DEFAULT_PROFILE` (threshold=35, sensitivity=25) que no puede borrarse.

```typescript
{
  profiles: CalibrationProfile[]
  selectedProfileId: string
  getSelected(): CalibrationProfile
  setProfiles(profiles: CalibrationProfile[]): void
  addProfile(profile: CalibrationProfile): void
  updateProfile(id: string, updates: Partial<CalibrationProfile>): void
  deleteProfile(id: string): void      // no-op si id === DEFAULT_PROFILE.id
  selectProfile(id: string): void
  persist(): void
}
```

### `trainingStore`

```typescript
{
  trainings: Training[]
  activePhase: TrainingPhase
  setActivePhase(phase: TrainingPhase): void
  setTrainings(trainings: Training[]): void
  addTraining(training: Training): void       // + storage.saveTraining(); antepone al array (newest-first)
  deleteTraining(id: string): void            // + storage.deleteTraining()
  deleteTrainingsByProfile(profileId: string): void  // borra todas las sesiones de un perfil (+ storage.deleteTraining por cada una)
  getProgressions(): {
    powerTrend: number[]    // powerMax por ronda del último training
    hpmTrend: number[]      // hpmAverage por ronda
    isFatigued: boolean
  }
  getUserPowerMax(profileId: string): number  // media del powerMax de las últimas 5 sesiones del perfil
}
```

### `workoutPlanStore`

```typescript
{
  plans: WorkoutPlan[]
  loaded: boolean
  load(): Promise<void>                                         // llamado en App.tsx al arrancar
  addPlan(plan: Omit<WorkoutPlan, 'id' | 'createdAt'>): void   // genera id = "plan-<ts>"
  updatePlan(id: string, changes: Partial<WorkoutPlan>): void
  deletePlan(id: string): void
  getById(id: string): WorkoutPlan | undefined
}
```

### `customExerciseStore`

```typescript
{
  exercises: Exercise[]
  loaded: boolean
  load(): Promise<void>                             // llamado en App.tsx al arrancar
  add(ex: Omit<Exercise, 'id'>): void               // id = "custom-<slug>-<ts>"
  addExercise(ex: Exercise): void                   // para imports wger; no-op si id ya existe
  remove(id: string): void
}
```

Los ejercicios se distinguen por prefijo en el `id`: sin prefijo = catálogo base, `custom-` = creado manualmente, `wger-` = importado de wger. `ExerciseSelector` fusiona automáticamente base + custom al listar.

---

## Storage (`src/services/storage.ts`)

Usa `expo-file-system` (legacy API). Ruta base: `<documentDirectory>/HitTracker/`.

```typescript
storage.saveTraining(training: Training): Promise<void>       // trainings/training_<id>.json
storage.loadTrainings(): Promise<Training[]>
storage.deleteTraining(id: string): Promise<void>
storage.saveProfiles(profiles: CalibrationProfile[]): Promise<void>   // profiles.json
storage.loadProfiles(): Promise<CalibrationProfile[]>
storage.saveDevices(devices: Device[]): Promise<void>                  // devices.json
storage.loadDevices(): Promise<Device[]>
storage.saveWorkoutPlans(plans: WorkoutPlan[]): Promise<void>          // workout_plans.json
storage.loadWorkoutPlans(): Promise<WorkoutPlan[]>
storage.saveCustomExercises(exercises: Exercise[]): Promise<void>      // custom_exercises.json
storage.loadCustomExercises(): Promise<Exercise[]>
```

---

## BLE (`src/services/bleConnection.ts`)

### UUIDs

| UUID (sufijo) | Tipo | Versión | Descripción |
|---|---|---|---|
| `...26a8` | NOTIFY | V2+ | Hit events / stream — `{uint32 timestamp_ms, uint16 magnitude}` 6 bytes (V3/V4) o 16 bytes (V2) |
| `...26a9` | READ | V2+ | Versión firmware (`uint8`: 2/3/4) |
| `...26aa` | WRITE | V3+ | Config: `{uint16 threshold_raw, uint16 cooldown_ms}` — 4 bytes |
| `...26ab` | READ | **V4** | Nivel de batería — `uint8` 0-100 % |

Service UUID completo: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`

### Parsers por versión de firmware

| Versión | Bytes | Estructura | magnitude |
|---|---|---|---|
| V1 | 16 | `{ts uint32, ax/ay/az float32}` | `sqrt(ax²+ay²+az²)` (m/s²) |
| V2 | 16 | `{ts uint32, ax/ay/az/gx/gy/gz int16}` | `round(sqrt(...))` raw |
| V3 | 6 | `{ts uint32, magnitude uint16}` | raw; `isPeak: true` |

### Configuración V3

El firmware V3 persiste `threshold_raw` y `cooldown_ms` en NVS (namespace `ht-cfg`). La app escribe la config al conectar y al cambiar el perfil activo:

```typescript
bleConnection.sendProfileConfig(threshold: number, rebound: number): Promise<void>
// threshold_raw = threshold * 10 (uint16)
// cooldown_ms   = rebound        (uint16)
```

Defaults del firmware si no existe config en NVS: threshold=300, cooldown=400ms.

---

## wgerService (`src/core/services/wgerService.ts`)

Integración con la API pública [wger.de/api/v2](https://wger.de/api/v2/). Solo lectura, sin autenticación.

```typescript
interface WgerExercise {
  id: number
  name: string
  description: string          // puede contener HTML
  category: { id: number; name: string }
  equipment: Array<{ id: number; name: string }>
  muscles: Array<{ name_en: string }>
}

searchExercises(query: string): Promise<WgerExercise[]>
// GET /exerciseinfo/?format=json&language=4&equipment=7&equipment=3&limit=100
// Intenta primero español (language=4); fallback inglés (language=2)
// Filtra por nombre client-side con el query; timeout 10s

mapToExercise(wger: WgerExercise): Exercise
// id:          "wger-{wger.id}"
// category:    10,12 → core | 13,8 → upper | 9 → lower | 11 → fullbody | otros → core
// equipment:   id===3 (dumbbells) → 'dumbbells'; id===7 (body weight) → 'none'
// description: strip HTML con /<[^>]*>/g
// rest:        30  (wger no expone este campo)
// difficulty:  'medium'
```

Filtro de equipamiento fijo: body weight (`7`) y dumbbells (`3`).

**UI (`WgerSearchScreen`)**: búsqueda con debounce de 2s, paginación client-side a 20 resultados ("Ver más"), detail sheet con botón importar. Los ejercicios importados se guardan en `customExerciseStore` (no se duplican si el id ya existe).

---

## Audio (`src/services/audio.ts`)

`expo-audio`. Archivos en `assets/sounds/`.

| Método | Archivo | Cuándo se usa |
|---|---|---|
| `oneBell()` | `one-bell.mp3` | Inicio de round |
| `twoBell()` | `two-bell.mp3` | Fin de round → resting (no es el último) |
| `threeBell()` | `three-bell.mp3` | Fin de round → finished (último round de la sesión) |
| `beep()` | `beep.mp3` | Countdown 3s/2s/1s (preparing y resting) |
| `countdownTick()` | `timer_countdown-once.mp3` | Últimos 10s del round |
| `countdownEnd()` | `timer_countdown-end.mp3` | Round en el segundo 1 |

Secuencias de audio en `Session/index.tsx` y `PlanRunner.tsx` (misma lógica en ambos):
- `preparing`: beep en 3s/2s/1s
- `preparing → round`: oneBell
- `round`: countdownTick en los últimos 10s, countdownEnd en el segundo 1
- `round → resting`: twoBell
- `resting`: beep en 3s/2s/1s
- `resting → round`: oneBell
- `round → finished` (último round): threeBell

`opening-bell.mp3` queda sin uso tras el cambio a los tres tonos diferenciados.

---

## Sistema de Colores (`src/theme.ts`)

```typescript
const colors = {
  bgPrimary:     '#0f0f0f',
  bgSecondary:   '#1a1a1a',
  bgTertiary:    '#252525',
  border:        '#2a2a2a',
  accent:        '#ff4444',
  accentHover:   '#ff6666',
  secondary:     '#c0c0c0',
  textPrimary:   '#e0e0e0',
  textSecondary: '#a0a0a0',
  textMuted:     '#808080',
}
```

Siempre usar `colors` de `theme.ts`. Nunca colores hardcodeados en componentes. Nunca emojis como iconos — usar `lucide-react-native`.

---

## Configuración TypeScript + Metro

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@shared/*": ["../shared/*"] }
  }
}
```

**`metro.config.js`:**
```javascript
config.watchFolders = [sharedRoot]            // path absoluto a ../shared
config.resolver.extraNodeModules = { '@shared': sharedRoot }
```

---

## Navegación

`BottomTabNavigator` con 5 tabs. Los tabs distintos de "Sesión" se deshabilitan cuando `activePhase` es `preparing`, `round` o `resting`.

| Icono | Tab | Componente | Ruta |
|---|---|---|---|
| LayoutDashboard | Inicio | `Dashboard` | — |
| Timer | Sesión | `Session/index` | — |
| ClipboardList | Entrenamiento | `PlanRunner/index` | — |
| Bluetooth | Dispositivos | `Devices` | — |
| SlidersHorizontal | Perfiles | `Profiles` | — |

`SessionDetail` se monta sobre la navegación completa (estado local en `MobileLayout`) al tocar una sesión en Dashboard.

---

## Arranque de la App (`App.tsx`)

```
SplashScreen.preventAutoHideAsync()
activateKeepAwakeAsync('global')
  ↓
Carga paralela:
  storage.loadTrainings()     → migrationService.migrate() → trainingStore
  storage.loadProfiles()      → profileStore
  storage.loadDevices()       → deviceStore
  storage.loadWorkoutPlans()  → workoutPlanStore
  storage.loadCustomExercises() → customExerciseStore
  ↓
min(width, height) >= 600 → lockOrientationAsync(LANDSCAPE) → TabletLayout
                          → MobileLayout (comportamiento actual)
  ↓
SplashScreen.hideAsync()
```

---

## Build y Distribución

```bash
npm run start           # expo start (Metro)
npm run android         # expo run:android (debug)
npm run android:release # expo run:android --variant release
npm run android:apk     # eas build --platform android --profile preview
npm run android:bundle  # eas build --platform android --profile production
npm run test            # Jest — tests unitarios de lógica de negocio
```

---

## Firmware ESP32

- **Board**: ESP32 DevKit C
- **IDE**: Arduino IDE 2
- **Upload speed**: 921600
- **Serial monitor**: 115200 baud
- **Frecuencia de muestreo**: ~100Hz (10ms/muestra)
- **Escala**: ±16g, 1g = 128 raw. Reposo ≈ 128. Golpe suave 400-700. Golpe fuerte 1000-1500+.

| Versión | Archivo | Protocolo | LEDs | Batería ADC |
|---|---|---|---|---|
| V2 | `FIRMWARE/HitTracker_V2/HitTracker_V2.ino` | Stream continuo — 16 bytes/10ms | No | No |
| V3 | `FIRMWARE/HitTracker_V3/HitTracker_V3.ino` | Hit events — 6 bytes/golpe; config BLE | No | No |
| **V4** | `FIRMWARE/HitTracker_V4/HitTracker_V4.ino` | Hit events — 6 bytes/golpe; config + batería BLE | **4 LEDs** | **GPIO 34** |

---

## Tests

Los tests cubren únicamente lógica de negocio pura — no componentes React Native.

| Directorio | Qué cubre |
|---|---|
| `shared/__tests__/` | `calibrationService`, `trainingService` |
| `src/__tests__/` | Lógica exclusiva de mobile |

Convención de nombre: `HT-XXX.test.ts` para tests de feature, `<nombre>.test.ts` para tests de servicio.

```bash
npm run test         # ejecuta todos los tests
```

---

## Notación de Combos (RoundComboEditor)

| Código | Golpe |
|---|---|
| `1` | Jab |
| `2` | Cross |
| `3` | Gancho izquierdo |
| `4` | Gancho derecho |
| `5` | Uppercut izquierdo |
| `6` | Uppercut derecho |
| `b` (sufijo) | Al cuerpo (ej: `3b`) |
| `Slip Iz` / `Slip Der` | Esquiva |
| `Step` | Paso de salida |
| `Duck` | Agachada |
| `Pivot` | Giro |

Ejemplo: `"1-2-3-Slip Iz-3b-6"` (máx 120 caracteres por round).
