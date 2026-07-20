import { create } from 'zustand'
import type { CalibrationProfile } from '../types'
import { storage } from '../../services/storage'
import { useDriveStore } from './driveStore'
import { uploadProfiles } from '../../services/driveSync'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 35,
  sensitivity: 25.0,
  createdAt: Date.now()
}

interface ProfileState {
  profiles: CalibrationProfile[]
  selectedProfileId: string
  setProfiles: (profiles: CalibrationProfile[]) => void
  addProfile: (profile: CalibrationProfile) => void
  updateProfile: (id: string, updates: Partial<CalibrationProfile>) => void
  deleteProfile: (id: string) => void
  selectProfile: (id: string) => void
  getSelected: () => CalibrationProfile
  persist: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: [DEFAULT_PROFILE],
  selectedProfileId: DEFAULT_PROFILE.id,

  setProfiles: (profiles) =>
    set({ profiles: profiles.length > 0 ? profiles : [DEFAULT_PROFILE] }),

  addProfile: (profile) => {
    set((state) => ({ profiles: [...state.profiles, profile] }))
    get().persist()
  },

  updateProfile: (id, updates) => {
    set((state) => ({
      profiles: state.profiles.map((p) => (p.id === id ? { ...p, ...updates } : p))
    }))
    get().persist()
  },

  deleteProfile: (id) => {
    const state = get()
    if (state.profiles.length <= 1) return
    if (id === state.selectedProfileId) return
    set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) }))
    get().persist()
  },

  selectProfile: (id) => set({ selectedProfileId: id }),

  getSelected: () => {
    const state = get()
    return state.profiles.find((p) => p.id === state.selectedProfileId) ?? DEFAULT_PROFILE
  },

  persist: () => {
    const profiles = get().profiles
    storage.saveProfiles(profiles)
    if (useDriveStore.getState().account) uploadProfiles(profiles)
  }
}))
