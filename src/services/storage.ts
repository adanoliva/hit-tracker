import * as FileSystem from 'expo-file-system/legacy'
import type { Training, CalibrationProfile, Device, WorkoutPlan, Exercise } from '../core/types'

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

// Escribe en .tmp y renombra (rename es atómico): si la app muere a mitad de escritura
// el archivo original queda intacto en vez de corrupto (y leído luego como []).
export async function writeJson(path: string, data: unknown): Promise<void> {
  const tmp = path + '.tmp'
  await FileSystem.writeAsStringAsync(tmp, JSON.stringify(data))
  await FileSystem.moveAsync({ from: tmp, to: path })
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await FileSystem.readAsStringAsync(path)
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// El id acaba en una ruta de archivo y puede venir de Drive: sin validar, un id con "../"
// escribiría fuera de trainings/. Los ids reales son "training-<ISO con : y . cambiados por ->".
const SAFE_ID = /^[\w-]+$/
function trainingPath(id: string): string {
  if (!SAFE_ID.test(id)) throw new Error(`id de sesión no válido: ${id}`)
  return TRAININGS_DIR + `training_${id}.json`
}

export const storage = {
  async saveTraining(training: Training) {
    await ensureDir(TRAININGS_DIR)
    await writeJson(trainingPath(training.id), training)
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
    await FileSystem.deleteAsync(trainingPath(id), { idempotent: true })
  },

  async saveProfiles(profiles: CalibrationProfile[]) {
    await ensureDir(BASE)
    await writeJson(BASE + 'profiles.json', profiles)
  },

  async loadProfiles(): Promise<CalibrationProfile[]> {
    return readJson<CalibrationProfile[]>(BASE + 'profiles.json', [])
  },

  async saveDevices(devices: Device[]) {
    await ensureDir(BASE)
    await writeJson(BASE + 'devices.json', devices)
  },

  async loadDevices(): Promise<Device[]> {
    return readJson<Device[]>(BASE + 'devices.json', [])
  },

  async saveWorkoutPlans(plans: WorkoutPlan[]) {
    await ensureDir(BASE)
    await writeJson(BASE + 'workout_plans.json', plans)
  },

  async loadWorkoutPlans(): Promise<WorkoutPlan[]> {
    return readJson<WorkoutPlan[]>(BASE + 'workout_plans.json', [])
  },

  async saveCustomExercises(exercises: Exercise[]) {
    await ensureDir(BASE)
    await writeJson(BASE + 'custom_exercises.json', exercises)
  },

  async loadCustomExercises(): Promise<Exercise[]> {
    return readJson<Exercise[]>(BASE + 'custom_exercises.json', [])
  },

}
