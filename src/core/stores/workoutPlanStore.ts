import { create } from 'zustand'
import type { WorkoutPlan } from '../types'
import { storage } from '../../services/storage'

interface WorkoutPlanStore {
  plans: WorkoutPlan[]
  loaded: boolean
  load: () => Promise<void>
  addPlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt'>) => void
  updatePlan: (id: string, changes: Partial<Omit<WorkoutPlan, 'id' | 'createdAt'>>) => void
  deletePlan: (id: string) => void
  getById: (id: string) => WorkoutPlan | undefined
}

export const useWorkoutPlanStore = create<WorkoutPlanStore>((set, get) => ({
  plans: [],
  loaded: false,

  load: async () => {
    const plans = await storage.loadWorkoutPlans()
    set({ plans, loaded: true })
  },

  addPlan: (plan) => {
    const newPlan: WorkoutPlan = { ...plan, id: `plan-${Date.now()}`, createdAt: Date.now() }
    set((state) => ({ plans: [...state.plans, newPlan] }))
    storage.saveWorkoutPlans(get().plans)
  },

  updatePlan: (id, changes) => {
    set((state) => ({
      plans: state.plans.map((p) => (p.id === id ? { ...p, ...changes } : p))
    }))
    storage.saveWorkoutPlans(get().plans)
  },

  deletePlan: (id) => {
    set((state) => ({ plans: state.plans.filter((p) => p.id !== id) }))
    storage.saveWorkoutPlans(get().plans)
  },

  getById: (id) => get().plans.find((p) => p.id === id),
}))
