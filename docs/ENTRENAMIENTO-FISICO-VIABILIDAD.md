# Entrenamiento Físico — Documento de Viabilidad

## Idea

Añadir una sección de **Entrenamiento físico** independiente del boxeo: rutinas de calentamiento, core y fullbody usando peso propio y/o mancuernas. El usuario puede seguir una rutina guiada directamente desde la app, sin necesidad de tener el sensor conectado.

---

## Opciones de fuente de datos

### Opción A — wger.de (REST API pública)

[wger.de](https://wger.de) es una plataforma open-source de fitness con API REST pública. No requiere API key para lectura.

**Lo que ofrece:**
- Catálogo de ~700 ejercicios con nombre, descripción, músculos implicados, imágenes y categoría
- Filtros por categoría (`/api/v2/exercise/?category=10&language=2&format=json`)
- Categorías relevantes: Core, Calentamiento, Pecho, Espalda, Piernas, Bíceps, etc.
- Imágenes de ejecución (`/api/v2/exerciseimage/`)
- API paginada, sin autenticación requerida

**Limitaciones:**
- Los nombres y descripciones están principalmente en inglés (hay traducciones parciales al español, no garantizadas)
- Las imágenes son ilustraciones simples (no fotos)
- Sin vídeos de demostración
- Requiere conexión a internet la primera vez; luego se puede cachear localmente

**Veredicto:** Viable como fuente inicial. Se descarga el catálogo una vez y se guarda en local (`exercises.json`). No hay dependencia en tiempo de ejecución.

---

### Opción B — Datos propios en local (sin API)

Definir manualmente un catálogo reducido (~30-50 ejercicios) curados para el contexto del boxeador: calentamiento específico, core de boxeo, movilidad de hombros, etc.

**Ventajas:**
- Sin dependencia de red
- Control total del contenido (nombres en español, imágenes propias, instrucciones adaptadas)
- Más ligero y rápido

**Desventajas:**
- Esfuerzo manual de redacción
- Catálogo más limitado

**Veredicto:** Apropiado si se quiere una experiencia muy curada. Se puede combinar con la opción A.

---

### Recomendación

**Híbrido**: un catálogo base local (~30 ejercicios curados en español, pensados para el boxeador) + opción de sincronizar más ejercicios desde wger.de cuando hay conexión. El catálogo local garantiza que la app funciona sin internet.

---

## Arquitectura propuesta

### Estructura de datos

```typescript
interface Exercise {
  id: string
  name: string                    // "Plancha isométrica"
  category: ExerciseCategory      // 'warmup' | 'core' | 'upper' | 'lower' | 'fullbody' | 'mobility'
  muscles: string[]               // ["Core", "Abdominales"]
  equipment: 'none' | 'dumbbells' | 'pull-up-bar'
  description: string
  imageUrl?: string               // local asset o URL remota cacheada
  duration?: number               // segundos (para ejercicios con tiempo)
  reps?: number                   // repeticiones (alternativo a duration)
  rest: number                    // segundos de descanso tras el ejercicio
  difficulty: 'easy' | 'medium' | 'hard'
}

interface Routine {
  id: string
  name: string                    // "Calentamiento boxeo", "Core 15min", "Fullbody"
  category: RoutineCategory       // 'warmup' | 'core' | 'fullbody'
  durationMin: number             // duración estimada en minutos
  exercises: RoutineExercise[]
  difficulty: 'easy' | 'medium' | 'hard'
}

interface RoutineExercise {
  exercise: Exercise
  sets?: number                   // si aplica
  reps?: number                   // override del ejercicio
  duration?: number               // override del ejercicio
}

interface WorkoutSession {
  id: string
  routineId: string
  createdAt: number
  durationMs: number              // tiempo real que tardó
  completedExercises: number
  totalExercises: number
  skipped: string[]               // ids de ejercicios saltados
}
```

### Capas

```
ExerciseService          → gestiona catálogo (local + sync wger)
RoutineService           → genera/guarda rutinas
useWorkout()             → hook para seguir una rutina en tiempo real
WorkoutScreen            → pantalla principal de la sección
  ├─ RoutinePicker       → selecciona rutina
  ├─ WorkoutPlayer       → guía el ejercicio actual (timer + instrucciones)
  ├─ WorkoutSummary      → resumen al terminar
  └─ ExerciseCatalog     → browse/búsqueda de ejercicios
```

### Persistencia

```
~/.config/HitTracker/           (desktop)
  exercises.json                 catálogo local
  routines.json                  rutinas predefinidas + personalizadas
  workoutSessions/
    workout_*.json

AsyncStorage / FileSystem        (mobile)
  exercises.json
  routines.json
  workout_*.json
```

---

## Flujo de usuario

```
Usuario entra en "Entrenamiento físico"
    ↓
Ve secciones: Calentamiento / Core / Fullbody
    ↓
Selecciona una rutina (ej: "Core 15min")
    ↓
Ve lista de ejercicios con duración total
    ↓
Pulsa "Iniciar"
    ↓
WorkoutPlayer: muestra ejercicio actual
  - Nombre + músculo
  - Ilustración / imagen
  - Timer de ejecución (cuenta atrás)
  - Instrucciones breves
  - Botones: Siguiente / Saltar
    ↓
Al terminar el tiempo → descanso automático (timer descanso)
    ↓
Siguiente ejercicio...
    ↓
Al completar todos → pantalla resumen
  - Tiempo total
  - Ejercicios completados/saltados
  - Calorías estimadas (opcional)
    ↓
Sesión guardada en historial
```

---

## Rutinas iniciales propuestas

### Calentamiento Boxeo (8 min)
| Ejercicio | Tipo | Duración |
|---|---|---|
| Rotaciones de cuello | Tiempo | 30s |
| Círculos de hombros | Tiempo | 30s |
| Rotaciones de muñecas | Tiempo | 30s |
| Jumping jacks | Tiempo | 45s |
| Sombra libre (shadow boxing) | Tiempo | 2 min |
| Rodillas al pecho (alternas) | Tiempo | 30s |
| Estiramiento de tríceps | Tiempo | 20s cada lado |
| Apertura de pecho | Tiempo | 30s |

### Core Boxeador (15 min)
| Ejercicio | Tipo | Series/Reps |
|---|---|---|
| Plancha isométrica | Tiempo | 3 × 30s |
| Crunch bicicleta | Reps | 3 × 20 |
| Russian twist | Reps | 3 × 15 |
| Mountain climbers | Tiempo | 3 × 30s |
| Leg raises | Reps | 3 × 12 |
| Plancha lateral | Tiempo | 2 × 20s cada lado |

### Fullbody sin material (20 min)
| Ejercicio | Tipo | Series/Reps |
|---|---|---|
| Sentadillas | Reps | 3 × 15 |
| Flexiones | Reps | 3 × 10 |
| Zancadas alternas | Reps | 3 × 10 cada pierna |
| Burpees | Reps | 3 × 8 |
| Superman (lumbar) | Reps | 3 × 12 |
| Fondos de tríceps (silla) | Reps | 3 × 10 |
| Sentadilla sumo | Reps | 3 × 12 |

---

## Integración wger.de (si se usa)

Endpoint base: `https://wger.de/api/v2/`

```
GET /exercise/?format=json&language=2&category=10
    → ejercicios en español de la categoría Core

GET /exercisecategory/?format=json
    → lista de categorías disponibles

GET /exerciseimage/?format=json&exercise=<id>
    → imágenes del ejercicio
```

**Estrategia de sincronización:**
1. En primer arranque (o en Ajustes > "Actualizar catálogo"), se hace fetch de las categorías relevantes
2. Los ejercicios se guardan en `exercises.json` local
3. Las imágenes se descargan y cachean en el directorio de la app
4. A partir de ahí, todo funciona offline

**Categorías de wger útiles:**
- 10 = Abs
- 8 = Arms  
- 12 = Back
- 14 = Calves
- 11 = Chest
- 9 = Legs
- 13 = Shoulders

---

## Consideraciones de UX

- **Sin sensor requerido**: esta sección es completamente independiente del BLE/ESP32 y del modo "Todo en 1". El botón de la sección debe estar accesible incluso sin dispositivo conectado.
- **Timer de descanso visual**: entre series y entre ejercicios, mostrar cuenta atrás clara con posibilidad de saltar.
- **Instrucciones breves**: máximo 2-3 frases. Priorizar la imagen sobre el texto.
- **Progresión**: mostrar el número de ejercicio actual (`3 / 7`) y una barra de progreso de la rutina.
- **Saltable**: el usuario puede saltar cualquier ejercicio sin que rompa el flujo.
- **Historial ligero**: no necesita tanta profundidad como el historial de boxeo. Con fecha, rutina y duración es suficiente.

---

## Esfuerzo estimado de implementación

| Tarea | Estimación |
|---|---|
| Tipos + stores (`exerciseStore`, `workoutStore`) | ~2h |
| Catálogo base local (30 ejercicios JSON) | ~3h |
| `WorkoutPlayer` (timer, navegación entre ejercicios) | ~4h |
| `RoutinePicker` + pantalla principal | ~2h |
| `WorkoutSummary` + persistencia | ~2h |
| Integración wger.de (sync opcional) | ~3h |
| Desktop (misma lógica, distinto layout) | ~3h |
| **Total estimado** | **~19h** |

---

## Decisiones pendientes antes de implementar

1. **¿Catálogo local solamente o integración wger.de?** La integración añade ~3h y complejidad de red; el catálogo manual es más controlado.
2. **¿Incluye mancuernas?** Afecta qué ejercicios meter y si filtrar por equipamiento disponible.
3. **¿Historial de entrenos físicos en el dashboard general o pantalla propia?** Recomendación: pantalla propia dentro de la sección, no mezclar con el historial de boxeo.
4. **¿Estimación de calorías?** Simple (MET × peso × tiempo) o sin ella. Requiere saber el peso del usuario.
5. **¿Rutinas personalizables?** El usuario podría crear sus propias rutinas eligiendo ejercicios del catálogo. Añade ~4h.

---

## Conclusión

La feature es **viable** con el stack actual (React + React Native, sin nuevas dependencias nativas). La parte más compleja es el `WorkoutPlayer` (gestión de timers, series, descansos), pero sigue el mismo patrón que `useTraining`. Con el catálogo local como base y wger.de como mejora opcional, la feature puede entregarse en una iteración de ~20 horas de trabajo efectivo.

**Recomendación**: empezar por catálogo local + `WorkoutPlayer` básico (ejercicios de tiempo sin series), validar la UX, y añadir soporte de series y wger.de en una segunda iteración.
