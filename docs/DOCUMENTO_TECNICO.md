# HIT TRACKER - Documento Técnico

## Descripción General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real con dos plataformas: una app de escritorio (Tauri 2 + React) y una app móvil (React Native + Expo). Ambas comparten tipos y lógica de negocio mediante una carpeta `shared/` con alias TypeScript `@shared`.

---

## Stack Tecnológico

### Desktop

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Tauri | 2 |
| Backend | Rust | — |
| UI | React | 18 |
| Lenguaje | TypeScript | 5.6 |
| Estilos | Tailwind CSS | 3 |
| Iconos | lucide-react | latest |
| Estado | Zustand | 4 |
| BLE | Rust (Tauri commands + events) | — |
| Gráficos | Recharts | 2 |
| Tests | Jest + ts-jest | — |
| Build | tauri build | — |

### Mobile

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Expo SDK | 56 |
| UI | React Native | 0.85 |
| Lenguaje | TypeScript | 6 |
| Iconos | lucide-react-native | latest |
| Estado | Zustand | 5 |
| BLE | react-native-ble-plx | 3 |
| Sensor nativo | react-native-sensors (temporal) | 7 |
| Audio | expo-audio | 56 |
| Persistencia | expo-file-system | 56 |
| Tests | Jest + ts-jest | — |

---

## Estructura de Carpetas

```
hit-tracker/
│
├─ shared/                         ← Código común a desktop y mobile
│  ├─ types/
│  │  └─ index.ts                  Todos los tipos del dominio
│  └─ services/
│     ├─ calibration.ts            calibrationService
│     └─ training.ts               trainingService (TrainingService class)
│
├─ src/tauri/                       ← Backend Rust (Tauri 2)
│  └─ src/main.rs                   Comandos invoke, BLE, file system
│
├─ src/                            ← Desktop (Renderer React)
│  └─ renderer/src/
│     ├─ types/index.ts            → re-export @shared/types
│     ├─ services/
│     │  ├─ audio.ts               HTMLAudioElement cache
│     │  ├─ calibration.ts         → re-export @shared/services/calibration
│     │  └─ training.ts            → re-export @shared/services/training
│     ├─ hooks/
│     │  ├─ useSensorData.ts       Detección de golpes, cálculo HPM
│     │  └─ useTraining.ts         Orquesta fases y timers
│     ├─ stores/
│     │  ├─ deviceStore.ts
│     │  ├─ profileStore.ts
│     │  └─ trainingStore.ts
│     └─ components/
│        ├─ Dashboard/
│        ├─ Devices/
│        ├─ Profiles/
│        ├─ Training/
│        ├─ Game/
│        └─ Progress/
│
├─ mobile/                         ← Mobile (Expo / React Native)
│  ├─ src/
│  │  ├─ core/
│  │  │  ├─ types/index.ts         → re-export @shared/types
│  │  │  ├─ services/
│  │  │  │  ├─ calibration.ts      → re-export @shared/services/calibration
│  │  │  │  └─ trainingService.ts  → re-export @shared/services/training
│  │  │  ├─ hooks/
│  │  │  │  ├─ useSensorData.ts    Idéntico a desktop en lógica
│  │  │  │  ├─ useTraining.ts      Idéntico a desktop en lógica
│  │  │  │  └─ useBleReading.ts    Suscribe lecturas BLE al callback activo
│  │  │  └─ stores/
│  │  │     ├─ deviceStore.ts
│  │  │     ├─ profileStore.ts
│  │  │     └─ trainingStore.ts
│  │  │
│  │  ├─ services/
│  │  │  ├─ audio.ts               expo-audio
│  │  │  ├─ ble.ts                 react-native-ble-plx (BleManager singleton)
│  │  │  ├─ bleConnection.ts       connect/disconnect/parse sensor BLE
│  │  │  └─ storage.ts             expo-file-system
│  │  │
│  │  └─ components/
│  │     ├─ Dashboard/
│  │     ├─ Devices/
│  │     ├─ Profiles/
│  │     ├─ Training/
│  │     └─ Game/
│  │
│  ├─ App.tsx
│  ├─ metro.config.js              watchFolders + extraNodeModules para @shared
│  └─ tsconfig.json                paths: @shared/* → ../shared/*
│
├─ vite.config.ts                  alias @shared → shared/
├─ tsconfig.web.json               paths: @shared/* → ./shared/*
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

```

---

## Servicios Compartidos

### calibrationService (`shared/services/calibration.ts`)

```typescript
calibrationService.createProfile(name: string): CalibrationProfile
// → id: `profile-${Date.now()}`, threshold: 15.0, sensitivity: 25.0

calibrationService.analyzeCalibrationSamples(
  light: number[], normal: number[], heavy: number[]
): { suggestedThreshold: number; suggestedSensitivity: number }
// threshold = avg(light) * 0.8
// sensitivity = 100 / (avg(heavy) - avg(light))

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

Presente en desktop (`src/renderer/src/hooks/`) y mobile (`mobile/src/core/hooks/`). Lógica idéntica.

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

Presente en desktop y mobile. Lógica idéntica.

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

---

## Tauri API (Desktop)

El renderer llama al backend Rust mediante `invoke()` de `@tauri-apps/api/core` y escucha eventos con `listen()` de `@tauri-apps/api/event`:

```typescript
// Entrenamientos
invoke('save_training', { training: Training }): Promise<void>
invoke('load_trainings'): Promise<Training[]>
invoke('delete_training', { id: string }): Promise<void>

// Dispositivos
invoke('load_devices'): Promise<Device[]>
invoke('save_devices', { devices: Device[] }): Promise<void>

// Perfiles
invoke('load_profiles'): Promise<CalibrationProfile[]>
invoke('save_profiles', { profiles: CalibrationProfile[] }): Promise<void>

// BLE
invoke('start_ble_scan'): Promise<void>
invoke('cancel_ble_scan'): Promise<void>
invoke('select_ble_device'): Promise<void>

// Eventos recibidos del backend
listen('ble-devices-updated', (event: { payload: BleDevice[] }) => void): Promise<UnlistenFn>
```

---

## Storage Mobile (`mobile/src/services/storage.ts`)

Usa `expo-file-system` (legacy API). Ruta base: `<documentDirectory>/HitTracker/`.

```typescript
storage.saveTraining(training)        // → trainings/training_<id>.json
storage.loadTrainings(): Training[]
storage.deleteTraining(id)
storage.saveProfiles(profiles)        // → profiles.json
storage.loadProfiles(): CalibrationProfile[]
storage.saveDevices(devices)          // → devices.json
storage.loadDevices(): Device[]
```

---

## Audio

### Desktop (`src/renderer/src/services/audio.ts`)
Cache de `HTMLAudioElement`. Ficheros en `public/sounds/`.
- `audioService.bell()` — apertura de asalto
- `audioService.beep()` — cuenta atrás
- `audioService.longBeep()` — playbackRate 0.5
- `audioService.countdown()` — sonido de cuenta atrás

### Mobile (`mobile/src/services/audio.ts`)
`expo-audio`. Equivalentes: bell, beep, countdown.

---

## Configuración de Alias TypeScript

### Desktop
**`tsconfig.web.json`**:
```json
"paths": {
  "@renderer/*": ["./src/renderer/src/*"],
  "@shared/*": ["./shared/*"]
}
```

**`vite.config.ts`**:
```typescript
alias: {
  '@renderer': resolve('src/renderer/src'),
  '@shared': resolve('shared')
}
```

### Mobile
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

### Desktop
```bash
npm run dev      # tauri dev
npm run build    # tauri build
npm run test     # Jest — tests unitarios
```
Requisitos: Node.js 18+, Rust toolchain. Targets: Windows (.exe / .msi), macOS (.dmg), Linux (.AppImage / .deb).

### Mobile
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
