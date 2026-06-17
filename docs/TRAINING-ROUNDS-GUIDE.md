# HIT TRACKER - Training + Rounds (Refactorización)

## Resumen del Cambio

**Antes:** Sesión plana con duración total
```
TrainingSession {
  duration: 300s
  impacts: [...]
}
```

**Ahora:** Estructura jerárquica
```
Training {
  rounds: [
    Round { duration: 180s, impacts: [...] },
    Round { duration: 180s, impacts: [...] },
    Round { duration: 180s, impacts: [...] }
  ]
  roundDuration: 180s
  restDuration: 60s
}
```

**Ventajas:**
- ✅ Refleja realidad del boxeo (rondas + descansos)
- ✅ Stats granulares por ronda
- ✅ Feedback durante descanso
- ✅ Análisis de progresión intra-entrenamiento
- ✅ Flexible: 3x5min, 5x2min, etc

---

## Arquitectura

### Tipos

```typescript
// Nuevo: RoundStats
{
  totalImpacts: 45
  validHits: 38
  validHitRate: 84.4%
  powerMax: 92.1
  rpmAverage: 15.2
  rpmMax: 18.5
  powerTrend: 'up'  // vs ronda anterior
}

// Nuevo: Round
{
  id: 'round_1'
  number: 1
  startTime: 1705420500000
  endTime: 1705420680000
  duration: 180000
  impacts: [...]
  stats: RoundStats
}

// Refactorizado: Training
{
  id: 'training_2025-01-16_14h32m47s'
  rounds: [Round, Round, Round]
  roundDuration: 180        // segundos
  restDuration: 60          // segundos
  
  // Stats globales
  totalImpacts: 135
  validHits: 114
  powerMax: 95.2
  avgRpmAcrossRounds: 15.1
  bestRound: 1              // índice
  totalDuration: 660000     // rondas + descansos
}
```

### Servicios

**TrainingService**

```typescript
// Iniciar entrenamiento
trainingService.startTraining(device, profile, 180, 3, 60)

// Iniciar ronda específica
trainingService.startRound(1)

// Registrar impacto
trainingService.onImpactDetected(impact)

// Finalizar ronda
const round = trainingService.finishRound()

// Finalizar entrenamiento
const training = trainingService.finishTraining()

// Obtener stats de ronda anterior (para comparación)
const prevStats = trainingService.getPreviousRoundStats()
```

### Hooks

**useTraining**

```typescript
const {
  // Configuración
  roundDuration, setRoundDuration,
  numRounds, setNumRounds,
  restDuration, setRestDuration,

  // Estado
  isTraining,
  isResting,
  isPreparing,
  currentRoundNumber,
  rounds,

  // Timers
  roundTimeRemaining,
  restTimeRemaining,
  prepTime,

  // Acciones
  startTraining,
  finishRound,
  finishTraining,
  getPreviousRoundStats
} = useTraining(device, profile)
```

---

## Flujo de Entrenamiento Completo

```
1. SETUP
   ├─ Selecciona saco + perfil
   ├─ Configura:
   │  ├─ Duración por ronda (180s)
   │  ├─ Número de rondas (3)
   │  └─ Descanso (60s)
   ├─ Calcula total: 11 minutos (3×180s + 2×60s)
   └─ Click "Iniciar"

2. PREPARACIÓN (10s)
   ├─ Pantalla: "PREPARADO"
   ├─ Contador: 10 → 9 → ... → 1
   └─ Sonido: beep cada segundo

3. RONDA 1 (180s)
   ├─ Sonido: campana (START)
   ├─ Gráfico en vivo
   ├─ Stats en vivo: Power, RPM, impactos
   ├─ 180 segundos activos
   ├─ Aviso a 10s
   └─ Sonido: ding ding (END)

4. DESCANSO 1 (60s)
   ├─ Pantalla de descanso
   ├─ Muestra stats ronda 1:
   │  ├─ Impactos: 45
   │  ├─ Hits válidos: 38 (84%)
   │  ├─ Power máximo: 92.1
   │  └─ RPM: 15.2
   ├─ Comparación con ronda 0 (si existe)
   │  └─ "Power SUBIÓ ↑"
   ├─ Contador: 60 → 59 → ... → 1
   └─ Aviso a 5s: "Prepárate para Ronda 2"

5. RONDA 2 (180s)
   └─ Repeat (pasos 3-4)

6. RONDA 3 (180s)
   └─ Repeat (pasos 3-4)

7. FINALIZACIÓN
   ├─ Pantalla de resultados
   ├─ Stats globales:
   │  ├─ Total impactos: 135
   │  ├─ Total válidos: 114 (84%)
   │  ├─ Power máximo: 95.2
   │  ├─ RPM promedio: 15.1
   │  └─ Mejor ronda: #2
   ├─ Gráfico de progresión:
   │  ├─ Ronda 1: 45 impactos
   │  ├─ Ronda 2: 48 impactos ↑
   │  └─ Ronda 3: 42 impactos ↓
   └─ Guardar entrenamiento
```

---

## Componentes UI Necesarios

### 1. TrainingSetup
Setup de rondas antes de empezar

```typescript
<TrainingSetup
  roundDuration={180}
  setRoundDuration={setRoundDuration}
  numRounds={3}
  setNumRounds={setNumRounds}
  restDuration={60}
  setRestDuration={setRestDuration}
  onStart={startTraining}
/>
```

Muestra:
- Sliders para configurar (duración, rondas, descanso)
- Total time calculado
- Botón "Iniciar"

---

### 2. TrainingPrep
Pantalla de preparación antes de ronda 1

```typescript
<TrainingPrep
  isPreparing={isPreparing}
  prepTime={prepTime}
/>
```

Muestra:
- "PREPARADO"
- Contador grande (10...1)
- Sonidos de beep

---

### 3. TrainingRound
Durante la ronda activa

```typescript
<TrainingRound
  currentRoundNumber={currentRoundNumber}
  totalRounds={numRounds}
  timeRemaining={roundTimeRemaining}
  impacts={impacts}
  powerMax={powerMax}
  rpmStats={rpmStats}
/>
```

Muestra:
- "Ronda 1/3"
- Tiempo grande (MM:SS)
- Gráfico de impactos en vivo
- Stats en tiempo real

---

### 4. TrainingRest
Durante el descanso

```typescript
<TrainingRest
  restTimeRemaining={restTimeRemaining}
  currentRound={currentRoundNumber}
  roundStats={rounds[currentRoundNumber - 1].stats}
  previousRoundStats={getPreviousRoundStats()}
/>
```

Muestra:
- Contador de descanso (MM:SS)
- Stats de la ronda que acaba de terminar
- Comparación con ronda anterior (si existe)
  - "Power SUBIÓ ↑" / "BAJÓ ↓" / "IGUAL →"
  - "RPM SUBIÓ ↑" / "BAJÓ ↓"
- Aviso a 5s: "Prepárate para ronda X"

---

### 5. TrainingResults
Resultados finales

```typescript
<TrainingResults
  training={training}
/>
```

Muestra:
- Stats globales
- Tabla de rondas con progresión
- Mejor ronda
- Gráficos de tendencia

---

## Ejemplos de Uso

### Ejemplo 1: Setup Básico (3x3min)

```typescript
// Usuario selecciona defaults
setRoundDuration(180)   // 3 min
setNumRounds(3)
setRestDuration(60)     // 1 min
// Total: 11 min (3×180 + 2×60)

startTraining()
```

Flow:
- Prep 10s → Ronda 1 (3min) → Descanso (1min) 
- → Ronda 2 (3min) → Descanso (1min) 
- → Ronda 3 (3min) → Resultados

---

### Ejemplo 2: Entrenamiento Intenso (5x2min)

```typescript
setRoundDuration(120)   // 2 min
setNumRounds(5)
setRestDuration(45)     // 45s
// Total: 13 min 45s

startTraining()
```

---

### Ejemplo 3: Calentamiento (2x1min + 1x5min)

```
// Nota: Sistema actual asume todas las rondas iguales
// Para caso asimétrico, se puede:
// 1. Hacer dos entrenamientos
// 2. Extender sistema para rondas variables (v2)
```

---

## Persistencia

### Estructura de archivo

```json
{
  "id": "training_2025-01-16_14h32m47s",
  "createdAt": 1705420300000,
  
  "device": {
    "mac": "AA:BB:CC:DD:EE:FF",
    "name": "Saco de entrenamiento"
  },
  
  "profile": { ... },
  
  "roundDuration": 180,
  "restDuration": 60,
  
  "rounds": [
    {
      "id": "round_1",
      "number": 1,
      "startTime": 1705420310000,
      "endTime": 1705420490000,
      "duration": 180000,
      "impacts": [
        {
          "time": 1705420315000,
          "intensity": 78.5,
          "magnitude": 85.2,
          "duration": 45,
          "isValid": true
        }
      ],
      "stats": {
        "totalImpacts": 45,
        "validHits": 38,
        "validHitRate": 84.4,
        "powerMax": 92.1,
        "rpmAverage": 15.2,
        "rpmMax": 18.5,
        "powerTrend": "stable"
      }
    },
    {
      "id": "round_2",
      "number": 2,
      "startTime": 1705420550000,
      "endTime": 1705420730000,
      "duration": 180000,
      "impacts": [...],
      "stats": {
        "totalImpacts": 48,
        "validHits": 41,
        "validHitRate": 85.4,
        "powerMax": 93.5,
        "rpmAverage": 16.0,
        "rpmMax": 19.2,
        "powerTrend": "up"
      }
    },
    {
      "id": "round_3",
      "number": 3,
      "startTime": 1705420790000,
      "endTime": 1705420970000,
      "duration": 180000,
      "impacts": [...],
      "stats": {
        "totalImpacts": 42,
        "validHits": 35,
        "validHitRate": 83.3,
        "powerMax": 90.8,
        "rpmAverage": 14.0,
        "rpmMax": 17.1,
        "powerTrend": "down"
      }
    }
  ],
  
  "totalDuration": 660000,
  "totalImpacts": 135,
  "validHits": 114,
  "powerMax": 95.2,
  "avgRpmAcrossRounds": 15.07,
  "bestRound": 1
}
```

---

## Migrando Sesiones Antiguas

Si tenías datos en formato `TrainingSession` plano, puedes convertir:

```typescript
// Convertir TrainingSession → Training
function migrateSession(oldSession: TrainingSession): Training {
  return {
    id: oldSession.id,
    createdAt: oldSession.createdAt,
    device: oldSession.device,
    profile: oldSession.profile,
    
    // Nueva estructura: empaquetar todo en una ronda
    rounds: [{
      id: 'round_1',
      number: 1,
      startTime: oldSession.createdAt,
      endTime: oldSession.createdAt + oldSession.duration,
      duration: oldSession.duration,
      impacts: oldSession.impacts,
      stats: {
        totalImpacts: oldSession.totalImpacts,
        validHits: oldSession.validHits,
        validHitRate: (oldSession.validHits / oldSession.totalImpacts) * 100,
        powerMax: oldSession.powerMax,
        rpmAverage: oldSession.rpmAverage,
        rpmMax: 0,
        powerTrend: 'stable'
      }
    }],
    
    roundDuration: oldSession.duration,
    restDuration: 0,
    totalDuration: oldSession.duration,
    totalImpacts: oldSession.totalImpacts,
    validHits: oldSession.validHits,
    powerMax: oldSession.powerMax,
    avgRpmAcrossRounds: oldSession.rpmAverage,
    bestRound: 0,
    notes: oldSession.notes
  }
}
```

---

## Análisis y Estadísticas

### Progresión dentro del entrenamiento

```typescript
// Obtener evolución de power a través de rondas
function getPowerProgression(training: Training): number[] {
  return training.rounds.map(r => r.stats.powerMax)
  // Ej: [92.1, 93.5, 90.8]
}

// Obtener evolución de hits válidos
function getValidHitRate(training: Training): number[] {
  return training.rounds.map(r => r.stats.validHitRate)
  // Ej: [84.4, 85.4, 83.3]
}

// Detectar si el usuario está cansado (baja en últimas rondas)
function isFatigued(training: Training): boolean {
  const rounds = training.rounds
  if (rounds.length < 2) return false
  
  const last = rounds[rounds.length - 1].stats.powerMax
  const first = rounds[0].stats.powerMax
  
  return last < first * 0.85  // bajó más del 15%
}
```

### Consistencia

```typescript
// Calcular varianza de impactos entre rondas
function getConsistencyScore(training: Training): number {
  const impacts = training.rounds.map(r => r.stats.totalImpacts)
  const mean = impacts.reduce((a, b) => a + b) / impacts.length
  const variance = impacts.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / impacts.length
  
  // Score 0-100 (100 = perfectamente consistente)
  return 100 - Math.sqrt(variance)
}
```

---

## Comparativa: Before / After

| Métrica | Antes | Ahora |
|---|---|---|
| Golpes totales | 135 | 135 |
| Golpes ronda 1 | ❌ No | ✅ 45 |
| Golpes ronda 2 | ❌ No | ✅ 48 |
| Power por ronda | ❌ No | ✅ Sí |
| RPM por ronda | ❌ No | ✅ Sí |
| Tendencia ronda | ❌ No | ✅ up/down/stable |
| Feedback descanso | ❌ No | ✅ Sí |
| Duración flexible | ❌ Fija | ✅ Configurable |
| Análisis fatiga | ❌ Difícil | ✅ Fácil |

---

## Próximos Pasos

1. ✅ Tipos refactorizados
2. ✅ Servicios refactorizados
3. ✅ Hooks refactorizados
4. ⏳ Componentes UI
5. ⏳ Stores (trainingStore en lugar de sessionStore)
6. ⏳ Tests
7. ⏳ Documentación final

---

## Notas Implementación

### timers

Los timers corren en el hook (useTraining) usando setInterval, no en servicios.
- Servicios = lógica pura
- Hooks = timers + estado React
- UI = visualización

### Audio

Función `playSound()` es placeholder. Implementar según plataforma:
- Electron: usar native module o IPC
- Web Audio API si es web

### Sincronización BLE

El flow es:
```
BLE → SensorReading → useSensorData() → Impact
                                           ↓
                                    onImpactDetected()
                                           ↓
                                    trainingService.onImpactDetected()
```

---

Esta refactorización es limpia, modular y fácil de mantener. Ready to build UI! 🚀
