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

export type SensorPlacement = 'front-vertical' | 'top-horizontal'

// [solo mobile]
export type PhoneSensorPlacement = SensorPlacement
export const PHONE_SENSOR_ID = 'PHONE_SENSOR'

export interface Impact {
  time: number
  intensity: number
  magnitude: number
  duration: number
  isValid: boolean
}

export interface Device {
  mac: string
  name: string
  createdAt: number
  lastSeen: number
  isConnected?: boolean
  placement?: SensorPlacement
}

export interface CalibrationData {
  calibratedAt: number
  samples: {
    light: number[]
    normal: number[]
    heavy: number[]
  }
}

export interface CalibrationProfile {
  id: string
  name: string
  threshold: number
  sensitivity: number
  calibrationData?: CalibrationData
  createdAt: number
}

export interface RoundStats {
  duration: number
  totalImpacts: number
  validHits: number
  validHitRate: number
  powerMax: number
  hpmAverage: number
  hpmMax: number
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
  hpmAverage: number
}

export interface AppConfig {
  theme: 'dark' | 'light'
  defaultProfileId?: string
  defaultDeviceMac?: string
}
