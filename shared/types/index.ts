export interface SensorReading {
  timestamp: number
  ax: number        // V1: m/s² (float) | V2: raw ADC / 16 (integer) | V3: 0 (not sent)
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
  magnitude: number // V1: m/s² float | V2: entero positivo (≈128 reposo, 600-1500+ golpe)
  isPeak?: boolean  // V3: firmware already detected this as a confirmed hit
}

export interface Impact {
  time: number
  intensity: number
  magnitude: number
  duration: number
}

export interface Device {
  mac: string
  name: string
  createdAt: number
  lastSeen: number
  isConnected?: boolean
}

export interface CalibrationData {
  calibratedAt: number
  samples: {
    light: number[]
    normal: number[]
    heavy: number[]
  }
}

export interface HitWindow {
  peak: number       // peak magnitude
  rebound: number    // ms from peak until signal settled below baseline
  reboundMax: number // highest magnitude seen during rebound phase
}

export interface CalibrationProfile {
  id: string
  name: string
  threshold: number
  sensitivity: number
  rebound?: number   // personalized cooldown in ms derived from real rebound data
  calibrationData?: CalibrationData
  createdAt: number
}

export interface RoundStats {
  duration: number
  totalImpacts: number
  powerMax: number
  hpmAverage: number
  hpmMax: number
  powerTrend: number[]
  isFatigued: boolean
  isCadenceDropped: boolean
}

export interface Round {
  number: number
  startTime: number
  endTime: number
  impacts: Impact[]
  stats: RoundStats
}

export interface Training {
  id: string
  appVersion?: string
  createdAt: number
  device: {
    mac: string
    name: string
  }
  profile: CalibrationProfile
  rounds: Round[]
  roundDuration: number
  numRounds: number
  restDuration: number
  totalImpacts: number
  powerMax: number
  hpmAverage: number
}

export interface AppConfig {
  theme: 'dark' | 'light'
  defaultProfileId?: string
  defaultDeviceMac?: string
}


export type ExerciseCategory = 'warmup' | 'core' | 'upper' | 'lower' | 'fullbody' | 'mobility' | 'boxing'

export interface Exercise {
  id: string
  name: string
  category: ExerciseCategory
  muscles: string[]
  equipment: 'none' | 'dumbbells' | 'pull-up-bar'
  description: string
  imageUrl?: string
  duration?: number
  reps?: number
  rest: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface RoutineExercise {
  exerciseId: string
  sets?: number
  reps?: number
  duration?: number
}

export interface Routine {
  id: string
  name: string
  category: ExerciseCategory
  durationMin: number
  exercises: RoutineExercise[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface BoxingRoundScript {
  round: number
  combo: string
  note?: string
}

export interface BoxingPhaseConfig {
  roundDuration: number
  numRounds: number
  restDuration: number
  roundScripts: BoxingRoundScript[]
}

export interface WorkoutPlan {
  id: string
  name: string
  createdAt: number
  warmupExerciseIds: string[]
  coreExerciseIds: string[]
  boxing: BoxingPhaseConfig
}
