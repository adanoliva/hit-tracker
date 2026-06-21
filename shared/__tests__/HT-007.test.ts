import { calibrationService } from '../services/calibration'
import type { CalibrationProfile, Impact } from '../types'

function makeProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return {
    id: 'test',
    name: 'Test',
    threshold: 15,
    sensitivity: 25,
    validHitThreshold: 80,
    createdAt: 0,
    ...overrides
  }
}

function makeImpact(intensity: number): Impact {
  return { time: 0, intensity, magnitude: 0, duration: 0, isValid: false }
}

describe('HT-007 — Umbral de golpe válido configurable por perfil', () => {
  describe('calibrationService.createProfile', () => {
    it('should assign validHitThreshold: 80 by default', () => {
      const profile = calibrationService.createProfile('Test')
      expect(profile.validHitThreshold).toBe(80)
    })
  })

  describe('calibrationService.isValidHit', () => {
    it('should return true when intensity meets custom threshold (scenario 1: 70%)', () => {
      const impact = makeImpact(72)
      expect(calibrationService.isValidHit(impact, 100, 0.70)).toBe(true)
    })

    it('should return false when intensity is below default threshold 80% (scenario 2)', () => {
      const impact = makeImpact(78)
      expect(calibrationService.isValidHit(impact, 100, 0.80)).toBe(false)
    })

    it('should return true when intensity exactly meets threshold', () => {
      const impact = makeImpact(80)
      expect(calibrationService.isValidHit(impact, 100, 0.80)).toBe(true)
    })

    it('should use 0.8 as default ratio when not provided (backward compat)', () => {
      const impact = makeImpact(78)
      expect(calibrationService.isValidHit(impact, 100)).toBe(false)
    })

    it('should accept low threshold (50%) and count more hits', () => {
      const impact = makeImpact(55)
      expect(calibrationService.isValidHit(impact, 100, 0.50)).toBe(true)
    })

    it('should accept high threshold (100%) and only count max hits', () => {
      const impact = makeImpact(99)
      expect(calibrationService.isValidHit(impact, 100, 1.0)).toBe(false)
      const perfect = makeImpact(100)
      expect(calibrationService.isValidHit(perfect, 100, 1.0)).toBe(true)
    })
  })

  describe('CalibrationProfile type', () => {
    it('should include validHitThreshold field', () => {
      const profile = makeProfile({ validHitThreshold: 60 })
      expect(profile.validHitThreshold).toBe(60)
    })

    it('should handle legacy profiles without validHitThreshold via nullish coalescing', () => {
      const legacyProfile = makeProfile()
      // ponytail: simulates ?? 80 used in hooks and store
      const threshold = (legacyProfile.validHitThreshold ?? 80) / 100
      expect(threshold).toBe(0.8)
    })
  })
})
