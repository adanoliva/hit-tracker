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
      hookThreshold: 80,
      stance: 'orthodox' as const,
      createdAt: Date.now()
    }
  },

  analyzeCalibrationSamples(
    light: number[],
    normal: number[],
    heavy: number[]
  ): { suggestedThreshold: number; suggestedSensitivity: number } {
    const lightAvg = avg(light)
    const heavyAvg = avg(heavy)

    const suggestedThreshold = lightAvg * 0.8
    const suggestedSensitivity = 100 / (heavyAvg - lightAvg)

    return {
      suggestedThreshold: Math.round(suggestedThreshold * 10) / 10,
      suggestedSensitivity: Math.round(suggestedSensitivity * 10) / 10
    }
  },

  calculateIntensity(magnitude: number, profile: CalibrationProfile): number {
    const raw = (magnitude - profile.threshold) * profile.sensitivity
    return Math.min(100, Math.max(0, Math.round(raw)))
  },

  isValidHit(impact: Impact, powerMax: number): boolean {
    return impact.intensity >= powerMax * 0.8
  }
}
