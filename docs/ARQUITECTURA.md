# HIT TRACKER - Arquitectura General

## Visión General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. Existe en dos plataformas independientes que comparten lógica de negocio:

- **Desktop** (`src/`): Tauri 2 + React + TypeScript
- **Mobile** (`mobile/`): React Native + Expo (Android)
- **Shared** (`shared/`): Tipos y servicios comunes a ambas plataformas

El hardware consiste en un **ESP32 + GY-521 (MPU-6050)** que transmite datos de acelerómetro/giroscopio vía Bluetooth BLE. En mobile también existe el modo **"Todo en 1"** donde el propio móvil actúa como sensor (sin ESP32).

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                           HARDWARE                                   │
│  ESP32 + GY-521  ──── BLE ────→  Desktop App   (noble)             │
│                   └── BLE ────→  Mobile App    (react-native-ble-plx)│
│  [o] Móvil como sensor ──────→  Mobile App    (react-native-sensors)│
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────┐   ┌──────────────────────────────┐
│        DESKTOP (Tauri 2)         │   │     MOBILE (Expo/RN)         │
│                                  │   │                              │
│  Rust backend (src/tauri/)       │   │  App.tsx                     │
│  ├─ BLE scan/connect             │   │  ├─ BLE (ble.ts)             │
│  └─ File system (JSON)           │   │  └─ PhoneSensor (sensors)    │
│       ↕ invoke() / events        │   │                              │
│  Renderer (React)                │   │  core/                       │
│  ├─ services/ (audio, mock)      │   │  ├─ hooks/                   │
│  ├─ hooks/ (useSensorData,       │   │  ├─ stores/                  │
│  │          useTraining)         │   │  └─ types/ → @shared/types   │
│  ├─ stores/ (Zustand)            │   │                              │
│  └─ components/                  │   │  services/                   │
│                                  │   │  ├─ audio.ts (expo-audio)    │
│                                  │   │  └─ storage.ts (expo-fs)     │
└──────────────┬───────────────────┘   └──────────────┬───────────────┘
               │                                       │
               └──────────────┬────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │    shared/          │
                   │  ├─ types/          │
                   │  └─ services/       │
                   │     ├─ calibration  │
                   │     └─ training     │
                   └─────────────────────┘
```

---

## Flujo de Datos (en ejecución)

```
Hardware/Sensor
      │  SensorReading {timestamp, ax, ay, az, gx, gy, gz, magnitude}
      ▼
useSensorData()
  ├─ Detecta pico: magnitude > threshold && cooldown > 200ms
  ├─ calculateIntensity() → escala 0-100 con sensitivity
  ├─ isValid: intensity >= powerMax * (profile.validHitThreshold / 100)
  └─ emite Impact → onImpactDetected()
      │
      ▼
useTraining()
  ├─ Fase: idle → preparing (10s) → round → resting → round → ... → finished
  ├─ trainingService.startRound(n)
  ├─ trainingService.onImpactDetected(impact)
  └─ trainingService.finishRound() → Round con RoundStats
      │
      ▼
trainingStore.addTraining(training)
      │
      ▼
Persistencia (Tauri invoke/expo-fs)
```

---

## Componentes Principales

### 1. Hardware (ESP32 + GY-521)

```
GY-521 (MPU-6050) ──I2C──→ ESP32
                             ├─ Lee acelerómetro 3D (ax, ay, az)
                             ├─ Lee giroscopio 3D (gx, gy, gz)
                             ├─ Calcula magnitude = sqrt(ax²+ay²+az²)
                             └─ Transmite vía BLE (GATT) si magnitude > umbral
```

Frecuencia de muestreo: ~50Hz (20ms por muestra).

### 2. Shared (código común)

`shared/types/index.ts` — interfaces canónicas: `SensorReading`, `Impact`, `Device`, `CalibrationProfile`, `Round`, `RoundStats`, `Training`, `AppConfig`, `SensorPlacement`, `PhoneSensorPlacement`.

`shared/services/calibration.ts` — `calibrationService`:
- `createProfile(name)` — perfil con valores por defecto (threshold 15.0, sensitivity 25.0)
- `analyzeCalibrationSamples(light, normal, heavy)` — sugiere threshold y sensitivity
- `calculateIntensity(magnitude, profile)` — escala 0-100
- `isValidHit(impact, powerMax, validRatio)` — intensity ≥ powerMax × validRatio (default 0.8)

`shared/services/training.ts` — `trainingService` (singleton):
- `startTraining(config)` / `finishTraining()` → `Training`
- `startRound(n)` / `finishRound()` → `Round` con `RoundStats` calculadas
- `onImpactDetected(impact)` — acumula impacts en la ronda activa
- `getPreviousRoundStats(n)` — comparativa entre rondas

### 3. Desktop — Backend Rust (Tauri 2)

`src/tauri/src/main.rs` — comandos Tauri y file system:

| Comando (`invoke`) | Operación |
|---|---|
| `save_training` / `load_trainings` / `delete_training` | JSON en `<appData>/HitTracker/trainings/` |
| `save_devices` / `load_devices` | `devices.json` |
| `save_profiles` / `load_profiles` | `profiles.json` |
| `save_game_scores` / `load_game_scores` | `game-scores.json` |
| `start_ble_scan` / `cancel_ble_scan` / `select_ble_device` | BLE nativo desde Rust |

Eventos emitidos al renderer: `ble-devices-updated` (lista de dispositivos encontrados).

### 4. Desktop — Renderer (React)

```
src/renderer/src/
├─ services/
│  ├─ audio.ts          HTMLAudioElement cache; bell, beep, countdown
│  ├─ mockSensor.ts     Genera lecturas sintéticas para desarrollo
│  ├─ calibration.ts    → re-export de @shared/services/calibration
│  └─ training.ts       → re-export de @shared/services/training
│
├─ hooks/
│  ├─ useSensorData.ts  Procesa stream raw, detecta picos, calcula HPM
│  └─ useTraining.ts    Orquesta fases y timers de rondas/descansos
│
├─ stores/ (Zustand)
│  ├─ deviceStore.ts    Dispositivos BLE + persistencia vía invoke()
│  ├─ profileStore.ts   Perfiles de calibración + persistencia
│  ├─ trainingStore.ts  Historial de entrenamientos + fase activa
│  └─ gameStore.ts      TOP 3 del modo Game + máquina de estados de partida
│
├─ types/index.ts       → re-export de @shared/types
│
└─ components/
   ├─ Dashboard/        Resumen y acceso rápido; click en sesión → SessionDetail
   ├─ Devices/          Gestión de dispositivos BLE
   ├─ Profiles/         Perfiles de calibración
   ├─ Training/         Sesión en tiempo real (rondas)
   ├─ Game/             Modo juego
   ├─ Progress/         Historial y tendencias
   └─ SessionDetail/    Detalle de sesión: gráfico scatter por round, eliminar
```

### 5. Mobile — Expo/React Native

```
mobile/src/
├─ core/
│  ├─ hooks/
│  │  ├─ useSensorData.ts    Idéntico a desktop en lógica
│  │  ├─ useTraining.ts      Idéntico a desktop en lógica
│  │  └─ usePhoneSensor.ts   [solo mobile, temporal] react-native-sensors a 50Hz — se elimina cuando el ESP32 esté disponible
│  │
│  ├─ stores/ (Zustand)
│  │  ├─ deviceStore.ts
│  │  ├─ profileStore.ts
│  │  ├─ trainingStore.ts
│  │  └─ gameStore.ts
│  │
│  ├─ services/
│  │  ├─ calibration.ts      → re-export de @shared/services/calibration
│  │  └─ trainingService.ts  → re-export de @shared/services/training
│  │
│  └─ types/index.ts         → re-export de @shared/types
│
├─ hooks/
│  └─ useShareSession.ts  captura PNG + share sheet nativo (react-native-view-shot + expo-sharing)
│
├─ utils/
│  └─ shareText.ts        generateShareText(training) — texto para share
│
├─ services/
│  ├─ audio.ts     expo-audio; bell, beep, countdown
│  ├─ ble.ts       react-native-ble-plx
│  └─ storage.ts   expo-file-system; JSON en documentDirectory/HitTracker/
│
└─ components/
   ├─ Dashboard/
   ├─ Devices/      Incluye PhoneSensorPicker (modo "Todo en 1")
   ├─ Profiles/
   ├─ Training/
   ├─ Game/
   └─ SessionDetail/ Detalle de sesión: gráfico scatter por round, eliminar
```

---

## Modelo de Datos Principal

```
Training
├─ id: string                         training-2025-06-19T...
├─ createdAt: number
├─ device: { mac, name }              snapshot
├─ profile: CalibrationProfile        snapshot
├─ roundDuration: number              segundos (0 = modo libre)
├─ numRounds: number
├─ restDuration: number               segundos
├─ rounds: Round[]
│  └─ Round
│     ├─ number, startTime, endTime
│     ├─ impacts: Impact[]
│     │  └─ Impact { time, intensity(0-100), magnitude, duration, isValid }
│     └─ stats: RoundStats
│        ├─ totalImpacts, validHits, validHitRate
│        ├─ powerMax, hpmAverage, hpmMax
│        ├─ powerTrend: number[]
│        └─ isFatigued: boolean
├─ totalImpacts, validHits, powerMax, hpmAverage  (agregados)
```

---

## Persistencia

### Desktop
```
%APPDATA%/HitTracker/   (o equiv. por SO)
├─ trainings/
│  └─ training-<ISO>.json     (un archivo por entrenamiento)
├─ devices.json
├─ profiles.json
├─ game-scores.json
└─ app-config.json
```

### Mobile
```
<documentDirectory>/HitTracker/
├─ trainings/
│  └─ training_<id>.json
├─ devices.json
├─ profiles.json
└─ game-scores.json
```

---

## Tecnologías

| Capa | Desktop | Mobile |
|---|---|---|
| Framework | Tauri 2 | Expo SDK 56 |
| UI | React 18 + TypeScript 5 | React Native 0.85 + TypeScript 6 |
| Backend | Rust (src/tauri/) | — |
| Estilos | Tailwind CSS 3 | StyleSheet (React Native) |
| Iconos | lucide-react | lucide-react-native |
| Estado | Zustand 4 | Zustand 5 |
| BLE | Rust (Tauri commands + events) | react-native-ble-plx 3 |
| Sensor nativo | — | react-native-sensors (temporal) |
| Audio | HTMLAudioElement | expo-audio |
| Persistencia | Rust fs (via invoke) | expo-file-system |
| Gráficos | Recharts 2 | react-native-svg |
| Tests | Jest + ts-jest | Jest + ts-jest |
| Build | tauri build | expo run:android / EAS |
| Firmware | Arduino IDE 2 + ESP32 DevKit C | — |

---

## Fases del Entrenamiento

```
idle → preparing (10s countdown) → round → resting → round → ... → finished
                                     ↑                  ↓
                                     └──── n rondas ────┘
```

- **preparing**: cuenta atrás de 10s, sonido beep cada segundo
- **round**: timer descendente (o libre si roundDuration=0), acumula impacts
- **resting**: cuenta atrás del descanso configurado
- **finished**: `trainingService.finishTraining()` agrega stats totales

En modo libre (`roundDuration = 0`) el timer sube en lugar de bajar y el usuario termina la ronda manualmente.
