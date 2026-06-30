import type { WorkoutPlan } from '../../shared/types'

// Mock storage before importing the store
jest.mock('../services/storage', () => ({
  storage: {
    loadWorkoutPlans: jest.fn().mockResolvedValue([]),
    saveWorkoutPlans: jest.fn().mockResolvedValue(undefined),
  }
}))

import { useWorkoutPlanStore } from '../core/stores/workoutPlanStore'

const BOXING_BASE = {
  roundDuration: 180,
  numRounds: 3,
  restDuration: 60,
  roundScripts: []
}

function makePlanInput(name = 'Plan A'): Omit<WorkoutPlan, 'id' | 'createdAt'> {
  return { name, warmupExerciseIds: [], coreExerciseIds: [], boxing: BOXING_BASE }
}

let mockNow = 1000000

beforeEach(() => {
  mockNow = 1000000
  jest.spyOn(Date, 'now').mockImplementation(() => mockNow++)
  useWorkoutPlanStore.setState({ plans: [], loaded: false })
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('HT-018 — WorkoutPlan store', () => {
  describe('addPlan', () => {
    it('should generate id and createdAt and add plan to state', () => {
      const before = Date.now()
      useWorkoutPlanStore.getState().addPlan(makePlanInput('Mi Plan'))
      const after = Date.now()

      const { plans } = useWorkoutPlanStore.getState()
      expect(plans).toHaveLength(1)
      expect(plans[0].name).toBe('Mi Plan')
      expect(plans[0].id).toMatch(/^plan-\d+$/)
      expect(plans[0].createdAt).toBeGreaterThanOrEqual(before)
      expect(plans[0].createdAt).toBeLessThanOrEqual(after)
    })

    it('should accumulate multiple plans', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput('A'))
      useWorkoutPlanStore.getState().addPlan(makePlanInput('B'))
      expect(useWorkoutPlanStore.getState().plans).toHaveLength(2)
    })

    it('should accept plan with empty exercise lists (valid per spec)', () => {
      useWorkoutPlanStore.getState().addPlan({ name: 'Solo Boxeo', warmupExerciseIds: [], coreExerciseIds: [], boxing: BOXING_BASE })
      expect(useWorkoutPlanStore.getState().plans[0].warmupExerciseIds).toEqual([])
    })
  })

  describe('deletePlan', () => {
    it('should remove plan from state', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput())
      const id = useWorkoutPlanStore.getState().plans[0].id
      useWorkoutPlanStore.getState().deletePlan(id)
      expect(useWorkoutPlanStore.getState().plans).toHaveLength(0)
    })

    it('should only remove the targeted plan', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput('A'))
      useWorkoutPlanStore.getState().addPlan(makePlanInput('B'))
      const { plans } = useWorkoutPlanStore.getState()
      const idA = plans.find((p) => p.name === 'A')!.id
      useWorkoutPlanStore.getState().deletePlan(idA)
      const remaining = useWorkoutPlanStore.getState().plans
      expect(remaining.some((p) => p.name === 'B')).toBe(true)
      expect(remaining.some((p) => p.name === 'A')).toBe(false)
    })

    it('should be a no-op for unknown id', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput())
      useWorkoutPlanStore.getState().deletePlan('no-existe')
      expect(useWorkoutPlanStore.getState().plans).toHaveLength(1)
    })
  })

  describe('getById', () => {
    it('should return the correct plan', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput('Target'))
      const id = useWorkoutPlanStore.getState().plans[0].id
      const found = useWorkoutPlanStore.getState().getById(id)
      expect(found?.name).toBe('Target')
    })

    it('should return undefined for unknown id', () => {
      expect(useWorkoutPlanStore.getState().getById('ghost')).toBeUndefined()
    })
  })

  describe('updatePlan', () => {
    it('should apply partial changes without touching id or createdAt', () => {
      useWorkoutPlanStore.getState().addPlan(makePlanInput('Original'))
      const { id, createdAt } = useWorkoutPlanStore.getState().plans[0]
      useWorkoutPlanStore.getState().updatePlan(id, { name: 'Actualizado' })
      const updated = useWorkoutPlanStore.getState().getById(id)!
      expect(updated.name).toBe('Actualizado')
      expect(updated.id).toBe(id)
      expect(updated.createdAt).toBe(createdAt)
    })
  })
})
