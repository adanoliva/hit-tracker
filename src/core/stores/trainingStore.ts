import { create } from 'zustand'
import type { Training } from '../types'
import { storage } from '../../services/storage'
import { useDriveStore } from './driveStore'
import { uploadTraining, deleteFromDrive } from '../../services/driveSync'

type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

interface TrainingState {
  trainings: Training[]
  activePhase: TrainingPhase
  setActivePhase: (phase: TrainingPhase) => void
  setTrainings: (trainings: Training[]) => void
  addTraining: (training: Training) => void
  addTrainingLocal: (training: Training) => void
  deleteTraining: (id: string) => void
  deleteTrainingsByProfile: (profileId: string) => void
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
    if (useDriveStore.getState().account) uploadTraining(training)
  },

  // Igual que addTraining pero sin re-subir a Drive — usado al descargar sesiones desde Drive.
  addTrainingLocal: (training) => {
    set((state) => ({ trainings: [training, ...state.trainings] }))
  },

  deleteTraining: (id) => {
    set((state) => ({ trainings: state.trainings.filter((t) => t.id !== id) }))
    storage.deleteTraining(id)
    if (useDriveStore.getState().account) deleteFromDrive(id)
  },

  deleteTrainingsByProfile: (profileId) => {
    const toDelete = get().trainings.filter((t) => t.profile?.id === profileId)
    set((state) => ({ trainings: state.trainings.filter((t) => t.profile?.id !== profileId) }))
    const account = useDriveStore.getState().account
    toDelete.forEach((t) => {
      storage.deleteTraining(t.id)
      if (account) deleteFromDrive(t.id)
    })
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
    // Usa round.stats.powerMax (siempre calculado con i.magnitude) en lugar de
    // Training.powerMax, que en sesiones antiguas estaba guardado como i.intensity (0-100)
    const perSession = sessions.map((t) =>
      t.rounds.length > 0 ? Math.max(...t.rounds.map((r) => r.stats.powerMax)) : t.powerMax
    )
    return Math.round(perSession.reduce((sum, v) => sum + v, 0) / perSession.length)
  }
}))
