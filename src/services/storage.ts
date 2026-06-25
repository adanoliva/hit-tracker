import * as FileSystem from 'expo-file-system/legacy'
import type { Training, CalibrationProfile, Device, GameTopThree } from '../core/types'

// Compatibilidad con entrenamientos grabados antes del renombrado rpm → hpm
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateTraining(t: any): any {
  for (const round of t.rounds ?? []) {
    if (round.stats && round.stats.hpmAverage === undefined) {
      round.stats.hpmAverage = round.stats.rpmAverage ?? 0
      round.stats.hpmMax = round.stats.rpmMax ?? 0
    }
  }
  if (t.hpmAverage === undefined) t.hpmAverage = t.rpmAverage ?? 0
  return t
}

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
        .map(async (f) => {
          const t = await readJson<Training | null>(TRAININGS_DIR + f, null)
          return t ? migrateTraining(t) : null
        })
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
  },

  async loadGameScores(): Promise<GameTopThree> {
    return readJson<GameTopThree>(BASE + 'game-scores.json', [null, null, null])
  },

  async saveGameScores(scores: GameTopThree) {
    await ensureDir(BASE)
    await FileSystem.writeAsStringAsync(BASE + 'game-scores.json', JSON.stringify(scores))
  }
}
