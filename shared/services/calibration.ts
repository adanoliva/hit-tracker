import type { CalibrationProfile, Impact } from '../types'

function avg(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export const calibrationService = {
  createProfile(name: string): CalibrationProfile {
    return {
      id: `profile-${Date.now()}`,
      name,
      threshold: 15.0,
      sensitivity: 25.0,
      createdAt: Date.now()
    }
  },

  analyzeCalibrationSamples(
    light: number[],
    normal: number[],
    heavy: number[]
  ): { suggestedThreshold: number; suggestedSensitivity: number } | null {
    const lightAvg = avg(light)
    const heavyAvg = avg(heavy)
    const base = lightAvg * 0.8
    const range = heavyAvg - base
    if (range < base * 0.2) return null
    const suggestedThreshold = Math.min(100, Math.max(0, Math.round((base / 10) * 10) / 10))
    const suggestedSensitivity = Math.min(100, Math.max(1, Math.round((range / 10) * 10) / 10))
    return { suggestedThreshold, suggestedSensitivity }
  },

  calculateIntensity(magnitude: number, profile: CalibrationProfile): number {
    const base = profile.threshold * 10
    const range = profile.sensitivity * 10
    if (range <= 0) return 0
    return Math.min(100, Math.max(0, Math.round((magnitude - base) / range * 100)))
  }
}
