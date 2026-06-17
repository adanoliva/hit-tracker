import { create } from 'zustand'
import type { Device } from '../types'

interface DeviceState {
  devices: Device[]
  connected: Device | null
  setDevices: (devices: Device[]) => void
  addDevice: (device: Device) => void
  updateDevice: (mac: string, updates: Partial<Device>) => void
  removeDevice: (mac: string) => void
  setConnected: (mac: string | null) => void
  persist: () => void
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  connected: null,

  setDevices: (devices) => set({ devices }),

  addDevice: (device) => {
    set((state) => ({ devices: [...state.devices, device] }))
    get().persist()
  },

  updateDevice: (mac, updates) => {
    set((state) => ({
      devices: state.devices.map((d) => (d.mac === mac ? { ...d, ...updates } : d)),
      connected:
        state.connected?.mac === mac ? { ...state.connected, ...updates } : state.connected
    }))
    get().persist()
  },

  removeDevice: (mac) => {
    set((state) => ({
      devices: state.devices.filter((d) => d.mac !== mac),
      connected: state.connected?.mac === mac ? null : state.connected
    }))
    get().persist()
  },

  setConnected: (mac) => {
    set((state) => ({
      connected: mac ? (state.devices.find((d) => d.mac === mac) ?? null) : null
    }))
  },

  persist: () => {
    window.api.saveDevices(get().devices)
  }
}))
