export interface SensorReading {
  timestamp: number
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
  magnitude: number
}

export type PunchType = 'jab' | 'cross' | 'right-hook' | 'left-hook' | 'unknown'

export interface Impact {
  time: number
  intensity: number
  magnitude: number
  duration: number
  isValid: boolean
  punchType: PunchType
  // raw sensor values en el pico (para clasificación)
  peakAx: number
  peakGz: number
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

export type Stance = 'orthodox' | 'southpaw'

export interface CalibrationProfile {
  id: string
  name: string
  threshold: number
  sensitivity: number
  hookThreshold: number  // |gz| mínimo para clasificar como hook (default 80)
  stance: Stance         // orthodox (diestro) o southpaw (zurdo)
  calibrationData?: CalibrationData
  createdAt: number
}

export interface RoundStats {
  duration: number
  totalImpacts: number
  validHits: number
  validHitRate: number
  powerMax: number
  rpmAverage: number
  rpmMax: number
  powerTrend: number[]
  isFatigued: boolean
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
  validHits: number
  powerMax: number
  rpmAverage: number
}

export interface AppConfig {
  theme: 'dark' | 'light'
  defaultProfileId?: string
  defaultDeviceMac?: string
}
