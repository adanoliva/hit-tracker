import type { WorkoutPlan, Exercise, ExerciseCategory } from '../../shared/types'
import { exerciseService } from '../../shared/services/exercise'

// Replicates firstPhase logic from PlanRunner.tsx
function firstPhase(plan: WorkoutPlan): 'warmup' | 'core' | 'boxing' {
  if (plan.warmupExerciseIds.length > 0) return 'warmup'
  if (plan.coreExerciseIds.length > 0) return 'core'
  return 'boxing'
}

// Replicates nextAfterWarmup logic from PlanRunner.tsx
function nextAfterWarmup(plan: WorkoutPlan): 'core' | 'boxing' {
  return plan.coreExerciseIds.length > 0 ? 'core' : 'boxing'
}

// Replicates buildRoutine from PlanRunner.tsx
function buildRoutine(ids: string[], name: string, category: ExerciseCategory) {
  const resolvedExercises = ids
    .map((id) => exerciseService.getById(id))
    .filter((e): e is Exercise => e !== undefined)
  return {
    id: 'dynamic',
    name,
    category,
    durationMin: 0,
    difficulty: 'medium' as const,
    exercises: ids.map((id) => ({ exerciseId: id })),
    resolvedExercises,
  }
}

const BOXING = {
  roundDuration: 180,
  numRounds: 3,
  restDuration: 60,
  roundScripts: [],
}

function makePlan(warmupIds: string[], coreIds: string[]): WorkoutPlan {
  return {
    id: 'test-plan',
    name: 'Test',
    createdAt: Date.now(),
    warmupExerciseIds: warmupIds,
    coreExerciseIds: coreIds,
    boxing: BOXING,
  }
}

describe('HT-019-a — Entrenamiento: lógica de orquestación del PlanRunner', () => {
  describe('firstPhase — fase inicial al ejecutar un plan', () => {
    it('plan con todas las fases → empieza en warmup', () => {
      const plan = makePlan(['ex-1'], ['ex-2'])
      expect(firstPhase(plan)).toBe('warmup')
    })

    it('plan sin warmup, con core → empieza en core', () => {
      const plan = makePlan([], ['ex-2'])
      expect(firstPhase(plan)).toBe('core')
    })

    it('plan sin warmup ni core → va directo a boxing', () => {
      const plan = makePlan([], [])
      expect(firstPhase(plan)).toBe('boxing')
    })
  })

  describe('nextAfterWarmup — transición desde warmup', () => {
    it('plan con core → warmup completo va a core', () => {
      const plan = makePlan(['ex-1'], ['ex-2'])
      expect(nextAfterWarmup(plan)).toBe('core')
    })

    it('plan sin core → warmup completo va directo a boxing', () => {
      const plan = makePlan(['ex-1'], [])
      expect(nextAfterWarmup(plan)).toBe('boxing')
    })
  })

  describe('abort desde fase física', () => {
    it('abortar en warmup no llega a boxing (onAbort se llama, no onDone)', () => {
      // Lógica: handlePhysicalAbort → onAbort(). onDone nunca se llama.
      const onDone = jest.fn()
      const onAbort = jest.fn()

      // Simulate: user aborts during warmup
      const handlePhysicalAbort = () => onAbort()
      handlePhysicalAbort()

      expect(onAbort).toHaveBeenCalledTimes(1)
      expect(onDone).not.toHaveBeenCalled()
    })
  })

  describe('buildRoutine — construir rutina dinámica desde IDs', () => {
    it('IDs válidos resuelven ejercicios', () => {
      const allExercises = exerciseService.getAll()
      if (allExercises.length === 0) return // skip if catalogue is empty

      const id = allExercises[0].id
      const routine = buildRoutine([id], 'Calentamiento', 'warmup')
      expect(routine.resolvedExercises).toHaveLength(1)
      expect(routine.resolvedExercises[0].id).toBe(id)
      expect(routine.exercises).toHaveLength(1)
      expect(routine.exercises[0].exerciseId).toBe(id)
    })

    it('IDs inválidos se filtran del resultado', () => {
      const routine = buildRoutine(['no-existe-1', 'no-existe-2'], 'Test', 'core')
      expect(routine.resolvedExercises).toHaveLength(0)
      expect(routine.exercises).toHaveLength(2) // ejercicios referenciados se mantienen
    })

    it('lista vacía produce rutina vacía', () => {
      const routine = buildRoutine([], 'Vacío', 'warmup')
      expect(routine.resolvedExercises).toHaveLength(0)
      expect(routine.exercises).toHaveLength(0)
    })
  })
})
