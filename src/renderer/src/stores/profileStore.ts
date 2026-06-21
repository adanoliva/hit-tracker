import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'
import type { CalibrationProfile } from '../types'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 15.0,
  sensitivity: 25.0,
  validHitThreshold: 80,
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
    set({ profiles: profiles.length > 0 ? profiles.map((p) => ({ ...p, validHitThreshold: p.validHitThreshold ?? 80 })) : [DEFAULT_PROFILE] }),

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
    if (id === DEFAULT_PROFILE.id) return
    set((state) => ({
      profiles: state.profiles.filter((p) => p.id !== id),
      selectedProfileId:
        state.selectedProfileId === id ? DEFAULT_PROFILE.id : state.selectedProfileId
    }))
    get().persist()
  },

  selectProfile: (id) => set({ selectedProfileId: id }),

  getSelected: () => {
    const state = get()
    return state.profiles.find((p) => p.id === state.selectedProfileId) ?? DEFAULT_PROFILE
  },

  persist: () => {
    invoke('save_profiles', { profiles: get().profiles })
  }
}))
