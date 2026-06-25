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
│  │     ├─ trainingStore.ts
│  │     └─ gameStore.ts
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
│  │  ├─ bleConnection.ts          connect/disconnect/parse sensor BLE
│  │  └─ storage.ts                expo-file-system
│  │
│  └─ components/
│     ├─ Dashboard/
│     ├─ Devices/
│     ├─ Profiles/
│     ├─ Training/
│     ├─ Game/
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
  ax: number           // aceleración X (m/s²)
  ay: number           // Y
  az: number           // Z
  gx: number           // giroscopio X (°/s)
  gy: number           // Y
  gz: number           // Z
  magnitude: number    // sqrt(ax²+ay²+az²)
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

interface CalibrationProfile {
  id: string
  name: string
  threshold: number            // umbral de detección (default 15.0)
  sensitivity: number          // escala de intensidad (default 25.0)
  validHitThreshold: number    // % del powerMax para golpe válido (default 80, rango 50-100) — ver HT-007
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

interface GameScore {
  initials: string  // 1–4 chars, uppercase
  score: number     // impact.magnitude (entero raw)
  date: number      // timestamp ms
}

type GameTopThree = [GameScore | null, GameScore | null, GameScore | null]

```

---

## Servicios Compartidos

### calibrationService (`shared/services/calibration.ts`)

```typescript
calibrationService.createProfile(name: string): CalibrationProfile
// → id: `profile-${Date.now()}`, threshold: 15.0, sensitivity: 25.0

calibrationService.analyzeCalibrationSamples(
  light: number[], normal: number[], heavy: number[]
): { suggestedThreshold: number; suggestedSensitivity: number } | null
// base = avg(light) * 0.8
// range = avg(heavy) - base
// → null si range < base * 0.2 (rango insuficiente: heavy no supera significativamente a light)
// threshold = base / 10, sensitivity = range / 10, ambos clampeados (threshold: 0-100, sensitivity: 1-100)

calibrationService.calculateIntensity(magnitude: number, profile: CalibrationProfile): number
// raw = (magnitude - threshold) * sensitivity
// → clamp(0, 100, round(raw))

calibrationService.isValidHit(impact: Impact, powerMax: number, validRatio: number): boolean
// → impact.intensity >= powerMax * validRatio
// validRatio = profile.validHitThreshold / 100  (default 0.8)
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

Algoritmo de detección:
1. Compara lectura actual con la anterior
2. Pico = magnitud bajando (`!isRising`) después de superar `threshold`
3. Cooldown mínimo de 200ms entre golpes (`PEAK_COOLDOWN_MS`)
4. HPM actual = golpes en últimos 10s × 6
5. HPM promedio = total golpes / minutos transcurridos

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

### gameStore

`src/core/stores/gameStore.ts`

```typescript
type GamePhase = 'idle' | 'waiting' | 'new-record' | 'loser'

{
  topThree: GameTopThree        // persiste en disco; null = posición vacía
  phase: GamePhase
  lastScore: number | null      // magnitude del golpe registrado
  pendingScore: number | null   // score en espera de iniciales (solo en 'new-record')
  startGame(): void             // idle → waiting
  cancelGame(): void            // waiting → idle, limpia scores
  registerHit(magnitude): void  // registra primer golpe; → new-record | loser
  submitInitials(initials): Promise<void>  // inserta en TOP 3, persiste, → idle
  resetToIdle(): void           // loser → idle
  loadScores(): Promise<void>   // carga game-scores.json desde disco
}
```

Lógica de negocio pura (funciones internas):
- `entersTopThree(score, top)` — `true` si hay hueco libre **o** `score > min` del TOP 3 lleno (estrictamente mayor)
- `insertScore(entry, top)` — ordena por score descendente, trunca a 3 entradas
- `minScoreForTop3(top)` — exportada; devuelve `min+1` si lleno, `0` si hay hueco

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
storage.loadGameScores(): GameTopThree  // → game-scores.json (fallback: [null,null,null])
storage.saveGameScores(scores)          // → game-scores.json
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
- Frecuencia de muestreo: ~50Hz
- Protocolo BLE: GATT. Envía `{timestamp, ax, ay, az, gx, gy, gz}` cuando `magnitude > umbral`.
