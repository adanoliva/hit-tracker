# HIT TRACKER — Arquitectura General

## Visión General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real.

| Plataforma | Stack | Estado |
|---|---|---|
| **Mobile** (`/`) | React Native + Expo (Android) | **Activa** |
| **Shared** (`shared/`) | TypeScript puro | Activa — lógica compartida |
| **Desktop** (`desktop/`) | Tauri 2 + React | Archivado (`desktop-freeze`) |
| **Web** (`web/`) | HTML/CSS/JS estático | Landing page marketing |

El hardware es un **ESP32 + GY-521 (MPU-6050)** que transmite datos de acelerómetro via Bluetooth BLE.

---

## Arquitectura de Alto Nivel

```
┌────────────────────────────────────┐
│             HARDWARE               │
│  ESP32 + GY-521                    │
│  V2: stream continuo (16 bytes)    │
│  V3: solo hit events (6 bytes)     │
└─────────────────┬──────────────────┘
                  │ BLE (react-native-ble-plx)
                  ▼
┌────────────────────────────────────┐
│         MOBILE — Expo/RN           │
│                                    │
│  bleConnection.ts                  │
│       ↓ SensorReading              │
│  useSensorData()     useBleReading()│
│       ↓ Impact                     │
│  useTraining()                     │
│       ↓ Training/Round             │
│  trainingStore  ──→  storage.ts    │
│                                    │
│  workoutPlanStore / customExercise │
│  profileStore / deviceStore        │
└─────────────────┬──────────────────┘
                  │ @shared alias
                  ▼
┌────────────────────────────────────┐
│             shared/                │
│  types/index.ts  — interfaces      │
│  services/calibration.ts           │
│  services/training.ts              │
│  services/exercise.ts              │
│  services/migration.ts             │
│  data/exercises.json               │
│  data/routines.json                │
└────────────────────────────────────┘
```

---

## Flujo de Datos — Sesión de Boxeo

```
Hardware/Sensor
  │ V3: {timestamp, magnitude, isPeak:true}   ← solo al detectar golpe (firmware)
  │ V2: {timestamp, ax, ay, az, gx, gy, gz}  ← stream a ~100Hz
  ▼
useBleReading()
  └─ bleConnection.connectBleDevice() — suscribe notificaciones GATT
  └─ parsea bytes → SensorReading según versión del firmware (V1/V2/V3)
  ▼
useSensorData(profile)
  ├─ V3 (isPeak=true): registra impacto directamente con magnitude
  ├─ V2: detecta pico por software
  │     · dynamicFloor decae hacia base (threshold×10) a 0.5 raw/ms
  │     · isPeak = !isRising && prevMag > dynamicFloor && Δt > cooldown
  │     · cooldown = profile.rebound ?? (200 + lastPeakMag × 0.3)
  │     · Al golpear: dynamicFloor sube a max(base, peak×0.4)
  └─ intensity = calculateIntensity(magnitude, profile) → 0-100
  ▼
useTraining() / PlanRunner.tsx
  ├─ Fase: idle → preparing (10s) → round → resting → round → ... → finished
  ├─ trainingService.startRound(n)
  ├─ trainingService.onImpactDetected(impact)
  └─ trainingService.finishRound() → Round con RoundStats
  ▼
trainingStore.addTraining(training)
  ▼
storage.saveTraining()  →  <documentDirectory>/HitTracker/trainings/training_<id>.json
```

---

## Flujo de Datos — Módulo Entrenamiento Físico

```
WorkoutPlan { warmupExerciseIds, coreExerciseIds, boxing: BoxingPhaseConfig }
  ▼
PlanRunner.tsx
  ├─ Fase warmup: buildRoutine(warmupIds) → WorkoutPlayer (useWorkoutPlayer)
  ├─ Fase core:   buildRoutine(coreIds)   → WorkoutPlayer (useWorkoutPlayer)
  └─ Fase boxing: startTraining() → TrainingRound/Rest/Results
                  (si no hay sensor: DUMMY_DEVICE, boxing funciona sin BLE)
```

---

## Hardware — ESP32 + GY-521

```
GY-521 (MPU-6050) ──I2C──→ ESP32
                             ├─ Acelerómetro 3D (ax, ay, az) a ±16g
                             ├─ Giroscopio 3D (gx, gy, gz)
                             ├─ magnitude = sqrt(ax²+ay²+az²)
                             ├─ V2: BLE stream continuo — 16 bytes cada 10ms
                             └─ V3: BLE solo hit events — 6 bytes por golpe
```

**Escala acelerómetro**: ±16g. 1g = 128 unidades raw. Reposo ≈ 128. Golpe suave: 400–700. Golpe fuerte: 1000–1500+.

**Versiones de firmware:**

| Versión | Archivo | Protocolo | LEDs | Batería |
|---|---|---|---|---|
| V2 | `FIRMWARE/HitTracker_V2/` | Stream continuo 16 bytes/10ms | No | No |
| V3 | `FIRMWARE/HitTracker_V3/` | Hit events 6 bytes; config BLE | No | No |
| **V4** | `FIRMWARE/HitTracker_V4/` | Hit events 6 bytes; config + batería BLE | **4 LEDs** | **ADC GPIO 34** |

**Posición del sensor — regla del punto de anclaje:**

El sensor debe colocarse en el punto de menor movimiento oscilatorio (pivote del péndulo). En cualquier otra posición el efecto látigo genera rebotes que pueden confundirse con golpes.

| Tipo de saco | Punto de anclaje | Posición del sensor |
|---|---|---|
| Saco colgado | Parte superior (cadena/gancho) | Arriba, cerca del enganche |
| Saco de pie | Parte inferior (base/mástil) | Abajo, periférico al mástil |

`sqrt(ax²+ay²+az²)` captura energía en los tres ejes — la orientación exacta del sensor no importa.

---

## Modelo de Datos Principal

```
Training
├─ id: string                         "training-<ISO-datetime>"
├─ appVersion?: string
├─ createdAt: number
├─ device: { mac, name }              snapshot al crear la sesión
├─ profile: CalibrationProfile        snapshot al crear la sesión
├─ roundDuration: number              segundos (0 = modo libre)
├─ numRounds: number
├─ restDuration: number               segundos
├─ rounds: Round[]
│  └─ Round
│     ├─ number, startTime, endTime
│     ├─ impacts: Impact[]
│     │  └─ Impact { time, intensity(0-100), magnitude, duration }
│     └─ stats: RoundStats
│        ├─ duration: number
│        ├─ totalImpacts: number
│        ├─ powerMax: number
│        ├─ hpmAverage: number
│        ├─ hpmMax: number
│        ├─ powerTrend: number[]      magnitud de cada golpe en orden
│        └─ isFatigued: boolean       2ª mitad < 1ª mitad × 0.85
├─ totalImpacts: number               agregado
├─ powerMax: number                   agregado
└─ hpmAverage: number                 agregado

WorkoutPlan
├─ id: string                         "plan-<timestamp>"
├─ name, createdAt
├─ warmupExerciseIds: string[]
├─ coreExerciseIds: string[]
└─ boxing: BoxingPhaseConfig
   ├─ roundDuration, numRounds, restDuration
   └─ roundScripts: BoxingRoundScript[]   combos por ronda (lista sparse)
```

---

## Árbol de Componentes

```
App.tsx
└─ MobileLayout (BottomTabNavigator — 5 tabs)
   ├─ Dashboard/         Inicio: stats, gráfico progreso, sesiones recientes
   ├─ Session/           Sesión de boxeo directa
   │  ├─ TrainingSetup   Configuración antes de la sesión
   │  ├─ TrainingRound   UI durante la ronda activa
   │  ├─ TrainingRest    UI durante el descanso
   │  └─ TrainingResults Resultados finales + compartir
   ├─ PlanRunner/        Módulo Entrenamiento
   │  ├─ index (list)    Lista de planes + navegación
   │  ├─ PlanBuilder     Crear/editar WorkoutPlan
   │  ├─ PlanRunner      Orquesta warmup→core→boxing
   │  ├─ CatalogScreen   Catálogo Calentamiento/Core/Boxing
   │  ├─ WgerSearchScreen Búsqueda e importación wger
   │  ├─ ExerciseSelector Lista con checkbox por categoría
   │  ├─ RoundComboEditor Editor de combos por round
   │  └─ BoxingExerciseForm Formulario ejercicio boxing custom
   ├─ Devices/           Escáner BLE + gestión dispositivos
   └─ Profiles/          CRUD perfiles de calibración + wizard

SessionDetail/           Detalle sesión (montado sobre la navegación desde Dashboard)
Workout/WorkoutPlayer    Player ejercicios físicos (usado por PlanRunner)
```

---

## Persistencia

```
<documentDirectory>/HitTracker/
├─ trainings/
│  └─ training_<id>.json
├─ devices.json
├─ profiles.json
├─ workout_plans.json
└─ custom_exercises.json
```

---

## Fases del Entrenamiento (Sesión de Boxeo)

```
idle → preparing (10s fijos) → round → resting → round → ... → finished
                                  ↑                  ↓
                                  └──── n rondas ────┘
```

- **preparing**: cuenta atrás de 10s; beep en 3s/2s, longBeep en 1s
- **round**: timer descendente (o libre si `roundDuration=0`); acumula impacts
- **resting**: cuenta atrás del descanso configurado; bell al inicio
- **finished**: `trainingService.finishTraining()` agrega stats totales y guarda

En **modo libre** (`roundDuration=0`): `roundTimeElapsed` sube; el usuario termina con `finishCurrentRound()`.

---

## Tecnologías

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Expo SDK | 56 |
| UI | React Native | 0.85 |
| Lenguaje | TypeScript | 6 |
| Iconos | lucide-react-native | 1.21 |
| Estado | Zustand | 5 |
| Navegación | React Navigation | 7 |
| BLE | react-native-ble-plx | 3 |
| Audio | expo-audio | 56 |
| Persistencia | expo-file-system | 56 |
| Gráficos | react-native-svg | 15 |
| Compartir | react-native-view-shot + expo-sharing | 5 / 56 |
| Tests | Jest + ts-jest | 30 / 29 |
| Build | expo run:android / EAS Build | — |
| Firmware | Arduino IDE 2, ESP32 DevKit C | — |
