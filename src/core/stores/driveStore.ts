import { create } from 'zustand'
import type { CalibrationProfile } from '../types'

export interface GoogleAccount {
  email: string
  displayName: string
  accessToken: string
  refreshToken: string
  expiresAt: number // timestamp ms
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'pending'

export interface PendingUpload {
  trainingId: string
  retries: number
  lastAttempt: number // timestamp ms
}

export interface ProfileConflict {
  local: CalibrationProfile[]
  remote: CalibrationProfile[]
}

interface DriveState {
  account: GoogleAccount | null
  isConnecting: boolean
  error: string | null
  syncStatus: SyncStatus
  pendingUploads: PendingUpload[]
  profileConflict: ProfileConflict | null
  setAccount: (account: GoogleAccount | null) => void
  setConnecting: (v: boolean) => void
  setError: (msg: string | null) => void
  setSyncStatus: (status: SyncStatus) => void
  setPendingUploads: (uploads: PendingUpload[]) => void
  addPending: (upload: PendingUpload) => void
  updatePending: (trainingId: string, updates: Partial<PendingUpload>) => void
  removePending: (trainingId: string) => void
  setProfileConflict: (conflict: ProfileConflict | null) => void
}

export const useDriveStore = create<DriveState>((set) => ({
  account: null,
  isConnecting: false,
  error: null,
  syncStatus: 'idle',
  pendingUploads: [],
  profileConflict: null,

  setAccount: (account) => set({ account }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  setError: (error) => set({ error }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setPendingUploads: (pendingUploads) => set({ pendingUploads }),

  addPending: (upload) => set((state) => ({
    pendingUploads: [...state.pendingUploads.filter((p) => p.trainingId !== upload.trainingId), upload],
  })),

  updatePending: (trainingId, updates) => set((state) => ({
    pendingUploads: state.pendingUploads.map((p) => (p.trainingId === trainingId ? { ...p, ...updates } : p)),
  })),

  removePending: (trainingId) => set((state) => ({
    pendingUploads: state.pendingUploads.filter((p) => p.trainingId !== trainingId),
  })),

  setProfileConflict: (profileConflict) => set({ profileConflict }),
}))
