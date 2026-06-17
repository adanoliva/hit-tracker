import { contextBridge, ipcRenderer } from 'electron'
import type { Training, Device, CalibrationProfile } from '../renderer/src/types'

export interface BleDevice {
  deviceId: string
  deviceName: string
}

const api = {
  // Trainings
  saveTraining: (training: Training) => ipcRenderer.invoke('save-training', training),
  loadTrainings: () => ipcRenderer.invoke('load-trainings'),
  deleteTraining: (id: string) => ipcRenderer.invoke('delete-training', id),

  // Devices
  loadDevices: () => ipcRenderer.invoke('load-devices'),
  saveDevices: (devices: Device[]) => ipcRenderer.invoke('save-devices', devices),

  // Profiles
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
  saveProfiles: (profiles: CalibrationProfile[]) =>
    ipcRenderer.invoke('save-profiles', profiles),

  // Config
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('save-config', config),

  // Bluetooth
  selectBleDevice: (deviceId: string) => ipcRenderer.send('ble-select-device', deviceId),
  cancelBleScan: () => ipcRenderer.send('ble-cancel-scan'),
  onBleDevicesUpdated: (callback: (devices: BleDevice[]) => void) => {
    const handler = (_: Electron.IpcRendererEvent, devices: BleDevice[]) => callback(devices)
    ipcRenderer.on('ble-devices-updated', handler)
    return () => ipcRenderer.removeListener('ble-devices-updated', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
