# HIT TRACKER - Documento Técnico

## Descripción General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. La plataforma activa es la app móvil Android (React Native + Expo). La lógica de negocio y tipos viven en `shared/` con alias TypeScript `@shared`.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Expo SDK | 56 |
| UI | React Native | 0.85 |
| Lenguaje | TypeScript | 6 |
| Iconos | lucide-react-native | latest |
| Estado | Zustand | 5 |
| BLE | react-native-ble-plx | 3 |
| Audio | expo-audio | 56 |
| Persistencia | expo-file-system | 56 |
| Captura de vista | react-native-view-shot | 5 |
| Share nativo | expo-sharing | 56 |
| Tests | Jest + ts-jest | — |

---

## Estructura de Carpetas

```
hit-tracker/                       ← raíz = app mobile
│
├─ shared/                         ← Código común
│  ├─ types/
│  │  └─ index.ts                  Todos los tipos del dominio
│  └─ services/
│     ├─ calibration.ts            calibrationService
│     └─ training.ts               trainingService (TrainingService class)
│
├─ src/
│  ├─ core/
│  │  ├─ types/index.ts            → re-export @shared/types
│  │  ├─ services/
│  │  │  ├─ calibration.ts         → re-export @shared/services/calibration
│  │  │  └─ trainingService.ts     → re-export @shared/services/training
│  │  ├─ hooks/
│  │  │  ├─ useSensorData.ts       Detección de golpes, cálculo HPM
│  │  │  ├─ useTraining.ts         Orquesta fases y timers
│  │  │  └─ useBleReading.ts       Suscribe lecturas BLE al callback activo
│  │  └─ stores/
│  │     ├─ deviceStore.ts
│  │     ├─ profileStore.ts
│  │     └─ trainingStore.ts
│  │
│  ├─ hooks/
│  │  └─ useShareSession.ts        Captura View como PNG + share sheet nativo
│  │
│  ├─ utils/
│  │  └─ shareText.ts              generateShareText(training) → plantilla share
│  │
│  ├─ services/
│  │  ├─ audio.ts                  expo-audio
│  │  ├─ ble.ts                    react-native-ble-plx (BleManager singleton)
│  │  ├─ bleConnection.ts          connect/disconnect/parse; sendProfileConfig; getSensorVersion
│  │  └─ storage.ts                expo-file-system
│  │
│  └─ components/
│     ├─ Dashboard/
│     ├─ Devices/
│     ├─ Entrenamiento/     Lista de planes, PlanRunner (warmup→core→boxing), PlanBuilder, ExerciseSelector, RoundComboEditor
│     ├─ Profiles/
│     ├─ Training/
│     └─ SessionDetail/
│
├─ App.tsx
├─ metro.config.js                 watchFolders + extraNodeModules para @shared
├─ tsconfig.json                   paths: @shared/* → ./shared/*
├─ desktop/                        ← archivado (tag desktop-freeze)
└─ docs/
```

---

## Tipos del Dominio (`shared/types/index.ts`)

```typescript
interface SensorReading {
  timestamp: number    // ms epoch
  ax: number           // aceleración X — raw ±16g (1g ≈ 128 unidades); V3: 0
  ay: number           // Y; V3: 0
  az: number           // Z; V3: 0
  gx: number           // giroscopio X (°/s); V3: 0
  gy: number           // Y; V3: 0
  gz: number           // Z; V3: 0
  magnitude: number    // sqrt(ax²+ay²+az²) — raw; reposo ≈ 128, golpe suave 400-700+
  isPeak?: boolean     // V3: true — el firmware ya detectó este paquete como golpe confirmado
}

interface Impact {
  time: number         // timestamp del golpe
  intensity: number    // 0-100
  magnitude: number    // raw
  duration: number     // ms (actualmente 0, reservado)
  isValid: boolean     // intensity >= powerMax * (profile.validHitThreshold / 100)
}

interface Device {
  mac: string
  name: string
  createdAt: number
  lastSeen: number
  isConnected?: boolean
}

interface HitWindow {
  peak: number        // magnitud del primer pico detectado (raw)
  rebound: number     // ms desde el pico hasta que el saco se asienta
  reboundMax: number  // magnitud máxima durante la fase de rebote
}

interface CalibrationProfile {
  id: string
  name: string
  threshold: number    // base de detección en raw/10; base = threshold×10 (default 15.0)
  sensitivity: number  // escala de intensidad en raw/10; range = sensitivity×10 (default 25.0)
  rebound?: number     // cooldown personalizado en ms — calculado por el wizard a partir de
                       // HitWindows reales; si ausente, se usa fórmula dinámica (200 + peak×0.3)
  calibrationData?: {
    calibratedAt: number
    samples: { light: number[]; normal: number[]; heavy: number[] }
  }
  createdAt: number
}

interface RoundStats {
  duration: number
  totalImpacts: number
  validHits: number
  validHitRate: number    // 0-100 %
  powerMax: number
  hpmAverage: number      // golpes/minuto promedio
  hpmMax: number
  powerTrend: number[]    // intensidad de cada golpe en orden
  isFatigued: boolean     // segunda mitad < primera mitad * 0.85
}

interface Round {
  number: number
  startTime: number
  endTime: number
  impacts: Impact[]
  stats: RoundStats
}

interface Training {
  id: string              // training-<ISO>
  createdAt: number
  device: { mac: string; name: string }
  profile: CalibrationProfile
  rounds: Round[]
  roundDuration: number   // segundos (0 = modo libre)
  numRounds: number
  restDuration: number    // segundos
  totalImpacts: number    // agregado de todas las rondas
  validHits: number
  powerMax: number
  hpmAverage: number
}

interface BoxingRoundScript {
  round: number         // 1-based
  combo: string         // notación libre, ej: "1-2-3-Slip Iz-3b-6"
  note?: string
}

interface BoxingPhaseConfig {
  roundDuration: number   // segundos (0 = modo libre)
  numRounds: number
  restDuration: number    // segundos
  roundScripts: BoxingRoundScript[]  // lista sparse — puede tener menos entradas que numRounds
}

interface WorkoutPlan {
  id: string              // plan-<timestamp>
  name: string
  createdAt: number
  warmupExerciseIds: string[]   // IDs de Exercise del catálogo
  coreExerciseIds: string[]
  boxing: BoxingPhaseConfig
}

```

---

## Servicios Compartidos

### calibrationService (`shared/services/calibration.ts`)

```typescript
calibrationService.createProfile(name: string): CalibrationProfile
// → id: `profile-${Date.now()}`, threshold: 15.0, sensitivity: 25.0

calibrationService.analyzeCalibrationWindows(
  light: HitWindow[], heavy: HitWindow[]
): { suggestedThreshold: number; suggestedSensitivity: number; suggestedRebound: number } | null
// lightAvg = avg(light.map(w => w.peak))  — pico máximo de cada golpe (raw)
// base = lightAvg * 0.8
// range = avg(heavy.map(w => w.peak)) - base
// → null si range < base * 0.2
// threshold = base / 10, sensitivity = range / 10  (clampeados: threshold 0-100, sensitivity 1-100)
// rebound = clamp(200, 700, max(all windows rebound durations) + 80ms)

calibrationService.calculateIntensity(magnitude: number, profile: CalibrationProfile): number
// base = threshold * 10,  range = sensitivity * 10  (ambos en raw units)
// → clamp(0, 100, round((magnitude - base) / range * 100))
```

### trainingService (`shared/services/training.ts`)

Singleton (`new TrainingService()` exportado).

```typescript
trainingService.startTraining(config: TrainingConfig): Training
trainingService.startRound(roundNumber: number): void
trainingService.onImpactDetected(impact: Impact): void
trainingService.finishRound(): Round | null      // calcula RoundStats
trainingService.finishTraining(): Training | null // agrega stats totales
trainingService.getCurrentTraining(): Training | null
trainingService.getCurrentRoundImpacts(): Impact[]
trainingService.getPreviousRoundStats(roundNumber: number): RoundStats | null
```

`calcRoundStats` interno:
- `isFatigued`: promedio de la segunda mitad de golpes < primera mitad × 0.85

---

## Hooks Personalizados

### useSensorData

`src/core/hooks/useSensorData.ts`

```typescript
function useSensorData(profile: CalibrationProfile): {
  impacts: Impact[]
  powerMax: number
  hpmStats: { current: number; average: number; max: number }
  processReading: (reading: SensorReading) => Impact | null
  reset: () => void
}
```

**Algoritmo de detección** (todas las magnitudes en raw — unidades consistentes con la calibración):

```
SensorReading recibido
    ↓
¿reading.isPeak === true? (firmware V3 ya detectó el golpe)
    │ sí → registra impacto directamente con reading.magnitude
    │ no → algoritmo V1/V2:
    │         1. dynamicFloor decae hacia base (profile.threshold×10) a 0.5 raw/ms
    │         2. isPeak = !isRising && prevMag > dynamicFloor && Δt > cooldown
    │         3. cooldown = profile.rebound  (si calibrado)
    │                     ?? 200ms + lastPeakMag × 0.3  (dinámico por magnitud)
    │         4. Al detectar pico: dynamicFloor sube a max(base, peak×0.4)
    └─ intensity = calculateIntensity(magnitude, profile)  → 0-100
```

El **cooldown dinámico** escala con la fuerza del golpe para cubrir rebotes más largos en golpes fuertes. Si el perfil tiene `rebound` (calculado por el wizard de calibración con datos reales del saco), ese valor tiene prioridad.

El **umbral dinámico** (`dynamicFloor`) sube al 40% del pico tras cada golpe y decae hacia el base en ~200ms. Filtra rebotes inmediatos sin bloquear combos rápidos.

HPM:
- Actual: golpes en últimos 10s × 6
- Promedio: total golpes / minutos transcurridos

### useTraining

`src/core/hooks/useTraining.ts`

```typescript
type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

function useTraining(): {
  phase: TrainingPhase
  currentRoundNumber: number
  totalRounds: number
  roundTimeRemaining: number   // segundos (cuenta atrás)
  roundTimeElapsed: number     // segundos (modo libre)
  restTimeRemaining: number
  prepTimeRemaining: number    // 10s fijos
  completedRounds: Round[]
  finishedTraining: Training | null
  isFreeMode: boolean          // roundDuration === 0
  startTraining(device, profile, roundDuration, numRounds, restDuration): void
  abortTraining(): void
  finishCurrentRound(): void   // termina ronda manualmente (modo libre)
  getPreviousRoundStats(): RoundStats | null
}
```

Transiciones de fase:
- `idle` → `preparing`: `startTraining()` — timer de 10s
- `preparing` → `round`: timer llega a 0 — `trainingService.startRound(1)`
- `round` → `resting`: timer llega a 0 — `trainingService.finishRound()`
- `resting` → `round`: timer llega a 0 — `trainingService.startRound(n+1)`
- `round` → `finished`: última ronda termina — `trainingService.finishTraining()`

### useShareSession `[solo mobile]`

```typescript
function useShareSession(options: {
  training: Training
  chartRef: React.RefObject<View | null>   // ref a la View a capturar como PNG
}): {
  share: () => Promise<void>
  isSharing: boolean
}
```

Flujo al llamar `share()`:
1. Captura `chartRef` como PNG con `react-native-view-shot` → guarda en `cacheDirectory/hit-tracker-share.png`
2. Abre el share sheet nativo vía `expo-sharing`
3. Si la captura falla → fallback a `Share.share({ message: text })` (solo texto)
4. `isSharing` es `true` durante todo el proceso; el botón que lo invoca debe deshabilitarse mientras sea `true`

Texto generado por `generateShareText(training)` (`mobile/src/utils/shareText.ts`):
```
¡Vaya sesión! {X} min y una media de {Y} HPM. ¡A tope! 💪
#hittracker #boxing #training
```
Donde `X = Math.round(totalDurationMs / 60000)` (o `"< 1 min"` si el resultado es 0) e `Y = Math.round(training.hpmAverage)`.

### useBleReading `[solo mobile]`

```typescript
function useBleReading(options: {
  deviceId: string | null
  active: boolean
  onReading: (reading: SensorReading) => void
}): void
```

Conecta al sensor BLE por `deviceId` (vía `bleConnection.connectBleDevice`) cuando `active` es `true`. Redirige las notificaciones GATT al callback `onReading`. Se desactiva automáticamente al desmontar o cuando `active` cambia a `false`.

---

## Stores (Zustand)

### deviceStore

```typescript
{
  devices: Device[]
  connected: Device | null
  setDevices(devices): void
  addDevice(device): void          // + persist()
  updateDevice(mac, updates): void // + persist()
  removeDevice(mac): void          // + persist()
  setConnected(mac | null): void
  persist(): void                  // invoke('save_devices') / storage.saveDevices()
}
```

### profileStore

```typescript
{
  profiles: CalibrationProfile[]
  selectedProfileId: string          // ID del perfil activo
  getSelected(): CalibrationProfile  // devuelve el perfil activo (o default si no hay)
  setProfiles(profiles): void
  addProfile(profile): void          // + persist()
  updateProfile(id, updates): void   // + persist()
  deleteProfile(id): void            // + persist()
  selectProfile(id): void            // cambia el perfil activo + persist()
  persist(): void
}
```

### trainingStore

```typescript
{
  trainings: Training[]
  activePhase: TrainingPhase
  setActivePhase(phase): void
  setTrainings(trainings): void
  addTraining(training): void        // + invoke('save_training') / storage.saveTraining()
  deleteTraining(id): void           // + invoke('delete_training') / storage.deleteTraining()
  getProgressions(): {
    powerTrend: number[]             // powerMax por ronda del último entrenamiento
    hpmTrend: number[]               // hpmAverage por ronda
    isFatigued: boolean
  }
  getUserPowerMax(profileId: string): number  // media aritmética del powerMax de las últimas 5 sesiones del perfil; 0 si no hay sesiones
}
```

### workoutPlanStore

`src/core/stores/workoutPlanStore.ts`. Se carga en el arranque de la app vía `load()`.

```typescript
{
  plans: WorkoutPlan[]
  loaded: boolean
  load(): Promise<void>             // carga desde disco; llamado en App.tsx al inicio
  addPlan(plan: Omit<WorkoutPlan, 'id' | 'createdAt'>): void   // genera id y createdAt + persiste
  updatePlan(id, changes): void     // merge parcial + persiste
  deletePlan(id): void              // + persiste
  getById(id): WorkoutPlan | undefined
}
```

### customExerciseStore

`src/core/stores/customExerciseStore.ts`. Se carga en el arranque de la app vía `load()`.

```typescript
{
  exercises: Exercise[]
  loaded: boolean
  load(): Promise<void>             // carga desde disco; llamado en App.tsx al inicio
  add(ex: Omit<Exercise, 'id'>): void   // genera id = "custom-<slug>-<timestamp>" + persiste
  remove(id: string): void              // filtra por id + persiste
}
```

Los ejercicios custom se distinguen de los del catálogo base por el prefijo `custom-` en su `id`. `ExerciseSelector` fusiona automáticamente base + custom al listar ejercicios por categoría.

---

## Storage (`src/services/storage.ts`)

Usa `expo-file-system` (legacy API). Ruta base: `<documentDirectory>/HitTracker/`.

```typescript
storage.saveTraining(training)        // → trainings/training_<id>.json
storage.loadTrainings(): Training[]
storage.deleteTraining(id)
storage.saveProfiles(profiles)        // → profiles.json
storage.loadProfiles(): CalibrationProfile[]
storage.saveDevices(devices)          // → devices.json
storage.loadDevices(): Device[]
storage.saveWorkoutPlans(plans)       // → workout_plans.json
storage.loadWorkoutPlans(): WorkoutPlan[]
storage.saveCustomExercises(exercises) // → custom_exercises.json
storage.loadCustomExercises(): Exercise[]
```

---

## Audio (`src/services/audio.ts`)

`expo-audio`. Métodos: `bell()`, `beep()`, `longBeep()`, `countdown()`.

---

## Configuración de Alias TypeScript

**`tsconfig.json`**:
```json
"baseUrl": ".",
"paths": { "@shared/*": ["../shared/*"] }
```

**`metro.config.js`**:
```javascript
config.watchFolders = [sharedRoot]          // ../shared
config.resolver.extraNodeModules = { '@shared': sharedRoot }
```

---

## Build y Distribución

```bash
npm run start    # expo start
npm run android  # expo run:android
npm run test     # Jest — tests unitarios
```
Build de producción: `eas build` (EAS Build de Expo).

---

## Firmware ESP32

- Board: ESP32 DevKit C
- IDE: Arduino IDE 2
- Upload speed: 921600
- Serial monitor: 115200 baud
- Frecuencia de muestreo: ~100Hz (10ms)
- Escala acelerómetro: **±16g** (1g = 128 unidades raw). Reposo: magnitude ≈ 128.

### Versiones

| Versión | Archivo | Protocolo |
|---|---|---|
| V2 | `FIRMWARE/HitTracker_V2/HitTracker_V2.ino` | Stream continuo, 16 bytes/10ms `{ts, ax, ay, az, gx, gy, gz}` |
| V3 | `FIRMWARE/HitTracker_V3/HitTracker_V3.ino` | Solo hit events, 6 bytes por golpe `{ts uint32, magnitude uint16}` |

### UUIDs BLE

| UUID | Tipo | Descripción |
|---|---|---|
| `...26a8` | NOTIFY | Lecturas (V2) / hit events (V3) |
| `...26a9` | READ | Versión del sensor (uint8) |
| `...26aa` | WRITE | Config en V3: `{threshold_raw uint16, cooldown_ms uint16}` |

### Configuración V3 (Preferences / NVS)

El firmware V3 persiste `threshold_raw` y `cooldown_ms` en NVS (namespace `ht-cfg`). Si no existen, usa defaults: threshold=300, cooldown=400ms. La app escribe la config via la characteristic `...26aa` al conectarse y al cambiar el perfil activo.

**Posición física del sensor:**

Colocar en el **punto de anclaje** del saco — el punto de menor oscilación pendular:

| Tipo de saco | Posición |
|---|---|
| Saco colgado | Cerca del enganche superior |
| Saco de pie | Base inferior, periférico al mástil |

Colocarlo lejos del anclaje genera efecto látigo: rebotes con magnitud similar o superior al golpe real, difíciles de filtrar por software. No es necesario centrar el sensor exactamente — `sqrt(ax²+ay²+az²)` integra la energía de los tres ejes independientemente de la orientación o excentricidad.
