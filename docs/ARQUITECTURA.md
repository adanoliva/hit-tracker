# HIT TRACKER - Arquitectura General

## Visión General

HIT TRACKER es un sistema de monitoreo de entrenamiento de boxeo en tiempo real. Plataforma activa:

- **Mobile** (`/`): React Native + Expo (Android) — plataforma activa
- **Shared** (`shared/`): Tipos y servicios comunes
- **Desktop** (`desktop/`): Tauri 2 + React — archivado (tag `desktop-freeze`)

El hardware consiste en un **ESP32 + GY-521 (MPU-6050)** que transmite datos de acelerómetro/giroscopio vía Bluetooth BLE.

---

## Arquitectura de Alto Nivel

```
┌───────────────────────────────────────────────┐
│                   HARDWARE                     │
│  ESP32 + GY-521  ──── BLE ────→  Mobile App   │
│                        (react-native-ble-plx)  │
└───────────────────────────────────────────────┘

┌──────────────────────────────┐
│       MOBILE (Expo/RN)       │
│                              │
│  App.tsx                     │
│  ├─ BLE (ble.ts)             │
│                              │
│  core/                       │
│  ├─ hooks/                   │
│  ├─ stores/                  │
│  └─ types/ → @shared/types   │
│                              │
│  services/                   │
│  ├─ audio.ts (expo-audio)    │
│  └─ storage.ts (expo-fs)     │
└──────────────┬───────────────┘
               │
   ┌───────────▼───────────┐
   │       shared/         │
   │  ├─ types/            │
   │  └─ services/         │
   │     ├─ calibration    │
   │     └─ training       │
   └───────────────────────┘
```

---

## Flujo de Datos (en ejecución)

```
Hardware/Sensor
      │  V2: SensorReading {timestamp, ax, ay, az, gx, gy, gz, magnitude}  — stream continuo
      │  V3: SensorReading {timestamp, magnitude, isPeak:true}               — solo al detectar golpe
      ▼
useSensorData()
  ├─ V3 (isPeak=true): registra impacto directamente, omite detección de pico
  ├─ V2: Detecta pico: prevMag > dynamicFloor && !isRising && cooldown transcurrido
  ├─    Cooldown dinámico: profile.rebound ?? (200ms + lastPeakMag × 0.3)
  ├─    Umbral dinámico: sube a peak×0.4 al golpear, decae hacia base
  ├─ calculateIntensity() → escala 0-100 con sensitivity
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
Persistencia (expo-file-system)
```

---

## Componentes Principales

### 1. Hardware (ESP32 + GY-521)

```
GY-521 (MPU-6050) ──I2C──→ ESP32
                             ├─ Lee acelerómetro 3D (ax, ay, az) a ±16g
                             ├─ Lee giroscopio 3D (gx, gy, gz)
                             ├─ Calcula magnitude = sqrt(ax²+ay²+az²)
                             ├─ V2: Transmite vía BLE continuamente (16 bytes/10ms)
                             └─ V3: Detecta golpes en firmware, transmite solo eventos de golpe (6 bytes por hit)
```

Frecuencia de muestreo: ~100Hz (10ms por muestra).

**Escala**: ±16g. En reposo: magnitude ≈ 128 unidades (1g = 128 raw). En golpe suave: 400–700+. En golpe fuerte: 1000–1500+.

**Posición del sensor — regla del punto de anclaje:**

El sensor debe colocarse en el punto de anclaje del saco, que es el de menor movimiento oscilatorio (pivote del péndulo). En cualquier otra posición el efecto látigo genera rebotes que el sensor puede confundir con golpes.

| Tipo de saco | Punto de anclaje | Posición del sensor |
|---|---|---|
| Saco colgado | Parte superior (cadena/gancho) | Arriba, cerca del enganche |
| Saco de pie | Parte inferior (base/mástil) | Abajo, periférico al mástil |

No es necesario que esté centrado exactamente — `sqrt(ax²+ay²+az²)` captura energía en los tres ejes, por lo que una colocación excéntrica en el perímetro de la base da resultados igual de precisos.

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

### 3. Mobile — Expo/React Native

```
src/
├─ core/
│  ├─ hooks/
│  │  ├─ useSensorData.ts    Detección de golpes, cálculo HPM
│  │  ├─ useTraining.ts      Orquesta fases y timers de rondas/descansos
│  │  └─ useBleReading.ts    Suscribe lecturas BLE al callback activo
│  │
│  ├─ stores/ (Zustand)
│  │  ├─ deviceStore.ts
│  │  ├─ profileStore.ts
│  │  ├─ trainingStore.ts
│  │  ├─ workoutPlanStore.ts
│  │  └─ customExerciseStore.ts
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
│  ├─ audio.ts         expo-audio; bell, beep, countdown
│  ├─ ble.ts           react-native-ble-plx (BleManager singleton)
│  ├─ bleConnection.ts connect/disconnect/parse sensor BLE
│  └─ storage.ts       expo-file-system; JSON en documentDirectory/HitTracker/
│
└─ components/
   ├─ Dashboard/
   ├─ Devices/
   ├─ Entrenamiento/
   │  ├─ index.tsx              Lista de planes + navegación builder/runner/catalog
   │  ├─ PlanCard.tsx           Tarjeta de plan con duración estimada y acciones
   │  ├─ PlanRunner.tsx         Orquesta warmup→core→boxing a partir de un WorkoutPlan
   │  ├─ PlanBuilder.tsx        Formulario de creación/edición de WorkoutPlan
   │  ├─ ExerciseSelector.tsx   Lista de ejercicios (base + custom) con checkbox por categoría
   │  ├─ BoxingConfigSection.tsx Controles de rounds reutilizables (duración, nº, descanso)
   │  ├─ RoundComboEditor.tsx   Editor de combos por round con referencia de notación
   │  ├─ CatalogScreen.tsx      Catálogo completo con tabs Calentamiento/Core/Boxing y buscador
   │  ├─ ExerciseDetailSheet.tsx Bottom sheet de detalle de ejercicio; permite eliminar si es custom
   │  └─ BoxingExerciseForm.tsx  Formulario para crear ejercicios de boxing personalizados
   ├─ Profiles/
   ├─ Training/
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

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | Expo SDK 56 |
| UI | React Native 0.85 + TypeScript 6 |
| Estilos | StyleSheet (React Native) |
| Iconos | lucide-react-native |
| Estado | Zustand 5 |
| BLE | react-native-ble-plx 3 |
| Audio | expo-audio |
| Persistencia | expo-file-system |
| Gráficos | react-native-svg |
| Compartir | react-native-view-shot + expo-sharing |
| Tests | Jest + ts-jest |
| Build | expo run:android / EAS Build |
| Firmware | Arduino IDE 2 + ESP32 DevKit C |

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
