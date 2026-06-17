import * as FileSystem from 'expo-file-system'
import type { Training, CalibrationProfile, Device } from '../core/types'

const BASE = FileSystem.documentDirectory + 'HitTracker/'
const TRAININGS_DIR = BASE + 'trainings/'

async function ensureDir(path: string) {
  await FileSystem.makeDirectoryAsync(path, { intermediates: true }).catch(() => {})
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await FileSystem.readAsStringAsync(path)
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const storage = {
  async saveTraining(training: Training) {
    await ensureDir(TRAININGS_DIR)
    await FileSystem.writeAsStringAsync(
      TRAININGS_DIR + `training_${training.id}.json`,
      JSON.stringify(training)
    )
  },

  async loadTrainings(): Promise<Training[]> {
    await ensureDir(TRAININGS_DIR)
    const files = await FileSystem.readDirectoryAsync(TRAININGS_DIR).catch(() => [] as string[])
    const results = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => readJson<Training | null>(TRAININGS_DIR + f, null))
    )
    return (results.filter(Boolean) as Training[]).sort((a, b) => b.createdAt - a.createdAt)
  },

  async deleteTraining(id: string) {
    await FileSystem.deleteAsync(TRAININGS_DIR + `training_${id}.json`, { idempotent: true })
  },

  async saveProfiles(profiles: CalibrationProfile[]) {
    await ensureDir(BASE)
    await FileSystem.writeAsStringAsync(BASE + 'profiles.json', JSON.stringify(profiles))
  },

  async loadProfiles(): Promise<CalibrationProfile[]> {
    return readJson<CalibrationProfile[]>(BASE + 'profiles.json', [])
  },

  async saveDevices(devices: Device[]) {
    await ensureDir(BASE)
    await FileSystem.writeAsStringAsync(BASE + 'devices.json', JSON.stringify(devices))
  },

  async loadDevices(): Promise<Device[]> {
    return readJson<Device[]>(BASE + 'devices.json', [])
  }
}
