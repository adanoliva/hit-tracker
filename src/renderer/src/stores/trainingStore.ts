import { create } from 'zustand'
import type { Training } from '../types'

interface TrainingState {
  trainings: Training[]
  setTrainings: (trainings: Training[]) => void
  addTraining: (training: Training) => void
  deleteTraining: (id: string) => void
  getProgressions: () => { powerTrend: number[]; rpmTrend: number[]; isFatigued: boolean }
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  trainings: [],

  setTrainings: (trainings) => set({ trainings }),

  addTraining: (training) => {
    set((state) => ({
      trainings: [training, ...state.trainings]
    }))
    window.api.saveTraining(training)
  },

  deleteTraining: (id) => {
    set((state) => ({ trainings: state.trainings.filter((t) => t.id !== id) }))
    window.api.deleteTraining(id)
  },

  getProgressions: () => {
    const { trainings } = get()
    if (trainings.length === 0) return { powerTrend: [], rpmTrend: [], isFatigued: false }

    const latest = trainings[0]
    const powerTrend = latest.rounds.map((r) => r.stats.powerMax)
    const rpmTrend = latest.rounds.map((r) => r.stats.rpmAverage)
    const isFatigued =
      powerTrend.length > 1 &&
      powerTrend[powerTrend.length - 1] < powerTrend[0] * 0.85

    return { powerTrend, rpmTrend, isFatigued }
  }
}))
