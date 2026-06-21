import { create } from 'zustand'
import type { Training } from '../types'
import { storage } from '../../services/storage'

type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

interface TrainingState {
  trainings: Training[]
  activePhase: TrainingPhase
  setActivePhase: (phase: TrainingPhase) => void
  setTrainings: (trainings: Training[]) => void
  addTraining: (training: Training) => void
  deleteTraining: (id: string) => void
  getProgressions: () => { powerTrend: number[]; hpmTrend: number[]; isFatigued: boolean }
  getUserPowerMax: (profileId: string) => number
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  trainings: [],
  activePhase: 'idle',
  setActivePhase: (phase) => set({ activePhase: phase }),

  setTrainings: (trainings) => set({ trainings }),

  addTraining: (training) => {
    set((state) => ({ trainings: [training, ...state.trainings] }))
    storage.saveTraining(training)
  },

  deleteTraining: (id) => {
    set((state) => ({ trainings: state.trainings.filter((t) => t.id !== id) }))
    storage.deleteTraining(id)
  },

  getProgressions: () => {
    const { trainings } = get()
    if (trainings.length === 0) return { powerTrend: [], hpmTrend: [], isFatigued: false }

    const latest = trainings[0]
    const powerTrend = latest.rounds.map((r) => r.stats.powerMax)
    const hpmTrend = latest.rounds.map((r) => r.stats.hpmAverage)
    const isFatigued =
      powerTrend.length > 1 && powerTrend[powerTrend.length - 1] < powerTrend[0] * 0.85

    return { powerTrend, hpmTrend, isFatigued }
  },

  getUserPowerMax: (profileId: string): number => {
    const { trainings } = get()
    const sessions = trainings.filter((t) => t.profile?.id === profileId).slice(0, 5)
    if (sessions.length === 0) return 0
    return Math.round(sessions.reduce((sum, t) => sum + t.powerMax, 0) / sessions.length)
  }
}))
