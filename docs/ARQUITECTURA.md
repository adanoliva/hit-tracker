# HIT TRACKER - Arquitectura General

## Visión General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. Existe en dos plataformas independientes que comparten lógica de negocio:

- **Desktop** (`src/`): Electron + React + TypeScript
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
│        DESKTOP (Electron)        │   │     MOBILE (Expo/RN)         │
│                                  │   │                              │
│  Main Process                    │   │  App.tsx                     │
│  ├─ BLE scan/connect (Web BT API)│   │  ├─ BLE (ble.ts)             │
│  ├─ ipc-handlers.ts              │   │  └─ PhoneSensor (sensors)    │
│  └─ preload → window.api         │   │                              │
│                                  │   │  core/                       │
│  Renderer (React)                │   │  ├─ hooks/                   │
│  ├─ services/ (audio, mock)      │   │  ├─ stores/                  │
│  ├─ hooks/ (useSensorData,       │   │  └─ types/ → @shared/types   │
│  │          useTraining)         │   │                              │
│  ├─ stores/ (Zustand)            │   │  services/                   │
│  └─ components/                  │   │  ├─ audio.ts (expo-audio)    │
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
  ├─ isValid: intensity >= powerMax * 0.8
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
Persistencia (IPC/expo-fs)
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
- `isValidHit(impact, powerMax)` — intensity ≥ powerMax × 0.8

`shared/services/training.ts` — `trainingService` (singleton):
- `startTraining(config)` / `finishTraining()` → `Training`
- `startRound(n)` / `finishRound()` → `Round` con `RoundStats` calculadas
- `onImpactDetected(impact)` — acumula impacts en la ronda activa
- `getPreviousRoundStats(n)` — comparativa entre rondas

### 3. Desktop — Proceso Main (Electron)

`src/main/ipc-handlers.ts` — handlers de file system:

| Canal IPC | Operación |
|---|---|
| `save-training` / `load-trainings` / `delete-training` | JSON en `<userData>/HitTracker/trainings/` |
| `save-devices` / `load-devices` | `devices.json` |
| `save-profiles` / `load-profiles` | `profiles.json` |
| `save-config` / `load-config` | `app-config.json` |
| `ble-select-device` / `ble-cancel-scan` | Web Bluetooth API vía `webContents` |

`src/preload/index.ts` — expone `window.api` al renderer mediante `contextBridge`.

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
│  ├─ deviceStore.ts    Dispositivos BLE + persistencia vía window.api
│  ├─ profileStore.ts   Perfiles de calibración + persistencia
│  └─ trainingStore.ts  Historial de entrenamientos + fase activa
│
├─ types/index.ts       → re-export de @shared/types
│
└─ components/
   ├─ Dashboard/        Resumen y acceso rápido
   ├─ Devices/          Gestión de dispositivos BLE
   ├─ Profiles/         Perfiles de calibración
   ├─ Training/         Sesión en tiempo real (rondas)
   ├─ Game/             Modo juego
   └─ Progress/         Historial y tendencias
```

### 5. Mobile — Expo/React Native

```
mobile/src/
├─ core/
│  ├─ hooks/
│  │  ├─ useSensorData.ts    Idéntico a desktop en lógica
│  │  ├─ useTraining.ts      Idéntico a desktop en lógica
│  │  └─ usePhoneSensor.ts   [solo mobile] react-native-sensors a 50Hz
│  │
│  ├─ stores/ (Zustand)
│  │  ├─ deviceStore.ts
│  │  ├─ profileStore.ts
│  │  └─ trainingStore.ts
│  │
│  ├─ services/
│  │  ├─ calibration.ts      → re-export de @shared/services/calibration
│  │  └─ trainingService.ts  → re-export de @shared/services/training
│  │
│  └─ types/index.ts         → re-export de @shared/types
│
├─ services/
│  ├─ audio.ts     expo-audio; bell, beep, countdown
│  ├─ ble.ts       react-native-ble-plx
│  └─ storage.ts   expo-file-system; JSON en documentDirectory/HitTracker/
│
└─ components/
   ├─ Dashboard/
   ├─ Devices/    Incluye PhoneSensorPicker (modo "Todo en 1")
   ├─ Profiles/
   ├─ Training/
   └─ Game/
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
└─ app-config.json
```

### Mobile
```
<documentDirectory>/HitTracker/
├─ trainings/
│  └─ training_<id>.json
├─ devices.json
└─ profiles.json
```

---

## Tecnologías

| Capa | Desktop | Mobile |
|---|---|---|
| Framework | Electron 33 | Expo SDK 56 |
| UI | React 18 + TypeScript 5 | React Native 0.85 + TypeScript 6 |
| Estado | Zustand 4 | Zustand 5 |
| BLE | Web Bluetooth API (Electron) | react-native-ble-plx 3 |
| Sensor nativo | — | react-native-sensors (acelerómetro) |
| Audio | HTMLAudioElement | expo-audio |
| Persistencia | Node.js fs (via IPC) | expo-file-system |
| Gráficos | Recharts 2 | react-native-svg |
| Build | electron-vite + electron-builder | expo run:android / EAS |
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
