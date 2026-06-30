import { create } from 'zustand'
import type { Exercise } from '../types'
import { storage } from '../../services/storage'

interface CustomExerciseStore {
  exercises: Exercise[]
  loaded: boolean
  load: () => Promise<void>
  add: (ex: Omit<Exercise, 'id'>) => void
  addExercise: (ex: Exercise) => void
  remove: (id: string) => void
}

export const useCustomExerciseStore = create<CustomExerciseStore>((set, get) => ({
  exercises: [],
  loaded: false,
  load: async () => {
    const exercises = await storage.loadCustomExercises()
    set({ exercises, loaded: true })
  },
  add: (ex) => {
    const slug = ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const newEx: Exercise = { ...ex, id: `custom-${slug}-${Date.now()}` }
    const exercises = [...get().exercises, newEx]
    set({ exercises })
    storage.saveCustomExercises(exercises)
  },
  addExercise: (ex) => {
    if (get().exercises.some((e) => e.id === ex.id)) return
    const exercises = [...get().exercises, ex]
    set({ exercises })
    storage.saveCustomExercises(exercises)
  },
  remove: (id) => {
    const exercises = get().exercises.filter((e) => e.id !== id)
    set({ exercises })
    storage.saveCustomExercises(exercises)
  },
}))
