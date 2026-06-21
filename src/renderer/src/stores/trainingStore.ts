import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { Training } from '../types'

type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

interface TrainingState {
  trainings: Training[]
  activePhase: TrainingPhase
  setActivePhase: (phase: TrainingPhase) => void
  setTrainings: (trainings: Training[]) => void
  addTraining: (training: Training) => void
  deleteTraining: (id: string) => void
  getProgressions: () => { powerTrend: number[]; hpmTrend: number[]; isFatigued: boolean }
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  trainings: [],
  activePhase: 'idle',
  setActivePhase: (phase) => set({ activePhase: phase }),

  setTrainings: (trainings) => set({ trainings }),

  addTraining: (training) => {
    set((state) => ({
      trainings: [training, ...state.trainings]
    }))
    invoke('save_training', { training })
  },

  deleteTraining: (id) => {
    set((state) => ({ trainings: state.trainings.filter((t) => t.id !== id) }))
    invoke('delete_training', { id })
  },

  getProgressions: () => {
    const { trainings } = get()
    if (trainings.length === 0) return { powerTrend: [], hpmTrend: [], isFatigued: false }

    const latest = trainings[0]
    const powerTrend = latest.rounds.map((r) => r.stats.powerMax)
    const hpmTrend = latest.rounds.map((r) => r.stats.hpmAverage)
    const isFatigued =
      powerTrend.length > 1 &&
      powerTrend[powerTrend.length - 1] < powerTrend[0] * 0.85

    return { powerTrend, hpmTrend, isFatigued }
  }
}))
