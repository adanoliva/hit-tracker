# HIT TRACKER - Features v2 (TODO)

## Visión General

Dos nuevas modalidades de entrenamiento para expandir la funcionalidad de HIT TRACKER:

1. **Rhythm Mode** - Entrenamiento con música (gamificado)
2. **Combos Mode** - Seguimiento de secuencias de golpes

---

## MODO 1: RHYTHM MODE 🎵

### Descripción

Modalidad gamificada donde el usuario golpea al ritmo de una canción. Similar a Brooklyn Fitboxing, con scoring basado en timing + intensidad.

### Arquitectura

```
Rhythm Mode (Nueva Modalidad)
├─ Carga de música (MP3/WAV)
├─ Análisis BPM automático
├─ Generación de targets (beats)
├─ Visualización Beatsaber-style
├─ Sistema de scoring
└─ Historial de sesiones Rhythm
```

### Componentes Necesarios

**Servicios:**
```typescript
// src/services/rhythm.ts
class RhythmService {
  loadMusic(filePath: string): Promise<AudioData>
  analyzeBPM(audio: AudioData): number
  generateTargets(bpm: number, duration: number): Target[]
  calculateScore(hits: Hit[], targets: Target[]): Score
}
```

**Tipos:**
```typescript
interface Target {
  time: number        // ms cuando debe golpear
  type: 'beat' | 'eighth'
}

interface Hit {
  targetTime: number
  hitTime: number
  accuracy: number   // ms de diferencia
  intensity: number
  score: number
}

interface RhythmSession extends TrainingSession {
  mode: 'rhythm'
  music: {
    filename: string
    bpm: number
    duration: number
  }
  targets: Target[]
  hits: Hit[]
  finalScore: number
  accuracy: number   // % targets acertados
}
```

### Flujo de Sesión Rhythm

```
Usuario selecciona "Rhythm Mode"
    ↓
Selecciona canción (MP3/WAV)
    ↓
App analiza BPM automáticamente
    ↓
Genera targets (cada beat o cada 2 beats)
    ↓
Muestra pantalla visual (targets cayendo)
    ↓
Usuario golpea al ritmo
    ↓
Sistema captura timing + intensidad
    ↓
Calcula score:
  - Perfect: ±50ms = 100pts
  - Great: ±100ms = 75pts
  - Good: ±200ms = 50pts
  - Miss: fuera = 0pts
  - Bonus por intensidad (+/-20pts)
    ↓
Al terminar canción → resultados + histórico
```

### UI Components Necesarios

```typescript
// src/components/Rhythm/
├─ RhythmSetup.tsx        // Carga música + BPM
├─ RhythmVisualizer.tsx   // Targets cayendo (Beatsaber-style)
├─ RhythmScore.tsx        // Score en vivo
└─ RhythmResults.tsx      // Resultados finales
```

### Sistema de Visualización (Beatsaber-style)

```
┌─────────────────────────────────┐
│  BPM: 120 | Score: 2450         │
├─────────────────────────────────┤
│                                 │
│        [Target acercándose]     │
│                 ↓               │
│                ◯◯◯              │
│                ◯ ◯              │
│               ◯   ◯             │
│                                 │
│         [Zona de impacto]       │
│                                 │
├─────────────────────────────────┤
│ Accuracy: 92% | Combo: 15       │
└─────────────────────────────────┘
```

### Persistencia

```json
{
  "id": "session_2025-01-20_19h30m15s",
  "mode": "rhythm",
  "createdAt": 1705780215000,
  
  "music": {
    "filename": "song.mp3",
    "bpm": 120,
    "duration": 180000
  },
  
  "targets": [
    { "time": 1000, "type": "beat" },
    { "time": 2000, "type": "beat" },
    { "time": 3000, "type": "beat" }
  ],
  
  "hits": [
    {
      "targetTime": 1000,
      "hitTime": 1045,
      "accuracy": 45,
      "intensity": 78,
      "score": 85
    }
  ],
  
  "finalScore": 2450,
  "accuracy": 92.5,
  "device": { "mac": "...", "name": "..." },
  "profile": { ... }
}
```

### Próximas Mejoras

- [ ] Integración Spotify (cargar canciones directo)
- [ ] Generador de targets inteligente (detecta drops, cambios)
- [ ] Multiplayer (competir con amigos)
- [ ] Leaderboards en línea
- [ ] Exportar video con overlay de score

---

## MODO 2: COMBOS MODE 🥊

### Descripción

Modalidad de entrenamiento enfocada en secuencias de golpes (combos). El usuario define combos de 3-5 golpes y el sistema trackea cuántos completa correctamente.

Las esquivas (falsos positivos) NO cuentan en el combo.

### Arquitectura

```
Combos Mode (Nueva Modalidad)
├─ Definición de combos (3-5 golpes)
├─ Visualización de combo actual
├─ Contador de golpes en combo
├─ Validación de secuencia
├─ Tracking de aciertos/fallos
└─ Historial de combos completados
```

### Componentes Necesarios

**Servicios:**
```typescript
// src/services/combos.ts
class ComboService {
  createCombo(name: string, sequence: ComboGolpe[]): Combo
  validateCombo(hits: Impact[], combo: Combo): ComboResult
  calculateComboStats(session: ComboSession): ComboStats
  getComboAccuracy(results: ComboResult[]): number
}
```

**Tipos:**
```typescript
interface ComboGolpe {
  order: number       // 1, 2, 3, 4, 5
  name: string        // "Jab", "Cross", "Hook", etc
  minIntensity: number // umbral mínimo para contar
  maxTimeDiff: number  // ms máximo entre golpes (300-500ms)
}

interface Combo {
  id: string
  name: string        // "1-2-3 básico", "Jab-Cross-Hook"
  golpes: ComboGolpe[]
  difficulty: 'easy' | 'medium' | 'hard'
  createdAt: number
}

interface ComboResult {
  comboId: string
  startTime: number
  endTime: number
  status: 'completed' | 'partial' | 'failed'
  completedGolpes: number  // cuántos del combo completó
  totalGolpes: number      // total esperados
  accuracy: number         // % de precisión
  totalTime: number        // tiempo que tardó
}

interface ComboSession extends TrainingSession {
  mode: 'combos'
  selectedCombo: Combo
  combosCompleted: number
  combosAttempted: number
  bestComboTime: number    // tiempo más rápido
  comboAccuracy: number    // % promedio
  results: ComboResult[]
}
```

### Flujo de Sesión Combos

```
Usuario selecciona "Combos Mode"
    ↓
Selecciona combo a practicar
    (ej: "Jab-Cross-Hook")
    ↓
Visualiza instrucciones
    ↓
Contador de combo: 0/3 golpes
    ↓
Usuario empieza a golpear
    ↓
Golpe 1 detectado (Jab) → "1/3" ✓
Golpe falso (esquiva) → se ignora
Golpe 2 detectado (Cross) → "2/3" ✓
Golpe 2B (falso) → se ignora
Golpe 3 detectado (Hook) → "3/3" COMBO COMPLETADO! ✓
    ↓
Sistema calcula:
  - Tiempo total: 1.2s
  - Intensidades detectadas: 65, 78, 72
  - Accuracy: 95%
    ↓
Combo completado → +50 puntos
Reinicia contador: 0/3
    ↓
Intenta siguiente combo
    ↓
Sesión termina (5-10 min)
    ↓
Resultados:
  - Combos completados: 12/15
  - Accuracy promedio: 92%
  - Tiempo promedio: 1.3s
  - Combo más rápido: 0.9s
```

### UI Components Necesarios

```typescript
// src/components/Combos/
├─ ComboSelector.tsx      // Elige combo
├─ ComboDisplay.tsx       // Muestra combo actual
├─ ComboCounter.tsx       // Progreso del combo (1/3, 2/3...)
├─ ComboHUD.tsx          // HUD durante sesión
└─ ComboResults.tsx      // Resultados finales
```

### Visualización en Tiempo Real

```
┌─────────────────────────────────┐
│    COMBO: Jab-Cross-Hook        │
├─────────────────────────────────┤
│                                 │
│    [1/3] JAB    ✓               │
│    [2/3] CROSS  ✓               │
│    [3/3] HOOK   ⏳               │
│                                 │
├─────────────────────────────────┤
│ Tiempo: 1.2s | Accuracy: 95%   │
│ Combos completados: 12/15       │
└─────────────────────────────────┘
```

### Sistema de Combo Predefinidos

App viene con combos básicos:

```json
{
  "combos": [
    {
      "id": "basic-1-2",
      "name": "1-2 (Jab-Cross)",
      "difficulty": "easy",
      "golpes": [
        { "order": 1, "name": "Jab", "minIntensity": 30, "maxTimeDiff": 500 },
        { "order": 2, "name": "Cross", "minIntensity": 40, "maxTimeDiff": 500 }
      ]
    },
    {
      "id": "basic-1-2-3",
      "name": "1-2-3 (Jab-Cross-Hook)",
      "difficulty": "easy",
      "golpes": [
        { "order": 1, "name": "Jab", "minIntensity": 30, "maxTimeDiff": 500 },
        { "order": 2, "name": "Cross", "minIntensity": 40, "maxTimeDiff": 500 },
        { "order": 3, "name": "Hook", "minIntensity": 35, "maxTimeDiff": 600 }
      ]
    },
    {
      "id": "advanced-1-2-3-2",
      "name": "1-2-3-2 (Jab-Cross-Hook-Cross)",
      "difficulty": "hard",
      "golpes": [
        { "order": 1, "name": "Jab", "minIntensity": 30, "maxTimeDiff": 400 },
        { "order": 2, "name": "Cross", "minIntensity": 40, "maxTimeDiff": 400 },
        { "order": 3, "name": "Hook", "minIntensity": 35, "maxTimeDiff": 500 },
        { "order": 4, "name": "Cross", "minIntensity": 40, "maxTimeDiff": 400 }
      ]
    }
  ]
}
```

### Persistencia

```json
{
  "id": "session_2025-01-20_20h45m30s",
  "mode": "combos",
  "createdAt": 1705784730000,
  
  "selectedCombo": {
    "id": "basic-1-2-3",
    "name": "1-2-3 (Jab-Cross-Hook)",
    "difficulty": "easy"
  },
  
  "results": [
    {
      "comboId": "basic-1-2-3",
      "startTime": 2000,
      "endTime": 3200,
      "status": "completed",
      "completedGolpes": 3,
      "totalGolpes": 3,
      "accuracy": 95,
      "totalTime": 1200
    },
    {
      "comboId": "basic-1-2-3",
      "startTime": 5000,
      "endTime": 6100,
      "status": "completed",
      "completedGolpes": 3,
      "totalGolpes": 3,
      "accuracy": 92,
      "totalTime": 1100
    }
  ],
  
  "combosCompleted": 12,
  "combosAttempted": 15,
  "comboAccuracy": 92.3,
  "bestComboTime": 900,
  
  "device": { "mac": "...", "name": "..." },
  "profile": { ... }
}
```

### Progreso y Estadísticas

En sección "Progreso", agregar:

```
Combos
├─ Combo más practicado: "1-2-3" (45 sesiones)
├─ Mejor accuracy: 96% (1-2-3-2)
├─ Combo más rápido: 0.8s (1-2)
├─ Combos completados (histórico):
│  ├─ Esta semana: 156/180 (87%)
│  ├─ Este mes: 542/650 (83%)
│  └─ Total: 1823/2100 (87%)
│
└─ Gráfico de evolución:
   Accuracy promedio por semana
   Velocidad (tiempo medio)
```

### Próximas Mejoras

- [ ] Editor de combos personalizado (usuario crea sus combos)
- [ ] Modo "Combo Campaign" (progresa de easy a hard)
- [ ] Combos cooperativos (dos usuarios alternados)
- [ ] Combo Counter (máxima racha de combos sin fallar)
- [ ] Combos temáticos por estilo (Boxeo clásico, Kickboxing, etc)

---

## Comparativa de Modos

| Aspecto | Training | Rhythm | Combos |
|---|---|---|---|
| Enfoque | Libre | Música/Ritmo | Secuencias |
| Puntuación | Power/RPM | Timing+Intensidad | Accuracy+Velocidad |
| Competencia | N/A | Score global | Combo counter |
| Música | No | Sí | No |
| Dificultad | Variable | Variable | Seleccionable |
| Best for | Principiantes | Entretenimiento | Técnica |

---

## Roadmap Implementación

**Phase 1 (v2.0):**
- ✅ Rhythm Mode básico
- ✅ Combos Mode básico
- ✅ UI/UX para ambos

**Phase 2 (v2.1):**
- [ ] Editor de combos personalizado
- [ ] Combo campaigns
- [ ] Sonidos/feedback mejorados

**Phase 3 (v2.2+):**
- [ ] Multiplayer Rhythm
- [ ] Combos cooperativos
- [ ] Leaderboards en línea
- [ ] Integración Spotify

---

## Notas Técnicas

### Detección de Esquivas vs Golpes Válidos

Para ignorer esquivas en Combos Mode:

```typescript
function isValidComboGolpe(impact: Impact, comboGolpe: ComboGolpe): boolean {
  // Debe tener suficiente intensidad
  if (impact.intensity < comboGolpe.minIntensity) {
    return false  // Es una esquiva/golpe débil
  }
  
  // Timing debe ser correcto (dentro de ventana)
  const timeSinceLast = impact.time - lastComboGolpeTime
  if (timeSinceLast > comboGolpe.maxTimeDiff) {
    return false  // Demasiado tiempo, new combo
  }
  
  return true  // Golpe válido para el combo
}
```

### Análisis BPM Automático

Para Rhythm Mode:

```typescript
// Usar librería de análisis de audio
// ej: librosa (Python) o tone.js (JS)
// Detecta tempo/BPM de canción

function detectBPM(audioBuffer: AudioBuffer): number {
  // TODO: implementar análisis FFT
  // Retorna BPM detectado
}
```

---

## Storage Adicional

```
~/.config/HitTracker/
├─ combos.json
│  └─ [{ id, name, golpes, difficulty }, ...]
│
├─ rhythmSessions/
│  └─ session_*.json
│
├─ comboSessions/
│  └─ session_*.json
│
└─ music/
   └─ canciones descargadas o referencias
```

---

## Consideraciones UX

### Rhythm Mode
- Visual tipo Beatsaber es atractivo pero requiere buen timing
- Incluir opción para ralentizar BPM en modo training
- Feedback inmediato (perfect/great/good/miss)

### Combos Mode
- Mostrar combo actual muy visible
- Ignorar golpes débiles automáticamente
- Contador visual claro (1/3, 2/3, 3/3)
- Sonido/vibración al completar combo
- Opción "restart" si falla

---

## Métricas a Trackear

**Rhythm Mode:**
- Score total
- Accuracy %
- Perfect/Great/Good/Miss count
- Max combo (golpes consecutivos perfectos)

**Combos Mode:**
- Combos completados/intentados
- Accuracy promedio
- Mejor tiempo
- Peor tiempo
- Racha sin errores

---

Esta es la visión completa para v2. Ambas modalidades expanden significativamente la funcionalidad sin complicar el MVP.
