import { calibrationService } from '../services/calibration'
import type { CalibrationProfile } from '../types'

function makeProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return { id: 'test', name: 'Test', threshold: 15, sensitivity: 25, createdAt: 0, ...overrides }
}

describe('HT-014 — analyzeCalibrationSamples', () => {
  it('calculates threshold and sensitivity for well-differentiated samples', () => {
    const light = [250, 260, 240, 255, 245]
    const heavy = [900, 950, 920, 880, 910]
    const result = calibrationService.analyzeCalibrationSamples(light, [], heavy)
    expect(result).not.toBeNull()
    // lightAvg=250, base=200, range=700, threshold=200/10=20, sensitivity=700/10=70
    expect(result!.suggestedThreshold).toBeCloseTo(20, 0)
    expect(result!.suggestedSensitivity).toBeCloseTo(70, 0)
  })

  it('returns null when heavy is not sufficiently stronger than light', () => {
    const light = [300, 310, 290, 305, 295]
    const heavy = [320, 330, 310, 325, 315]
    expect(calibrationService.analyzeCalibrationSamples(light, [], heavy)).toBeNull()
  })

  it('clamps extreme values within slider range (1-100)', () => {
    const light = [400, 420, 380, 410, 390]
    const heavy = [2500, 2600, 2400, 2550, 2450]
    const result = calibrationService.analyzeCalibrationSamples(light, [], heavy)
    expect(result).not.toBeNull()
    expect(result!.suggestedThreshold).toBeGreaterThanOrEqual(0)
    expect(result!.suggestedThreshold).toBeLessThanOrEqual(100)
    expect(result!.suggestedSensitivity).toBeGreaterThanOrEqual(1)
    expect(result!.suggestedSensitivity).toBeLessThanOrEqual(100)
  })
})

describe('HT-007 — calculateIntensity (formula V2)', () => {
  it('returns 0 below detection base (threshold*10)', () => {
    const profile = makeProfile()
    expect(calibrationService.calculateIntensity(100, profile)).toBe(0)
  })

  it('returns 100 at threshold*10 + sensitivity*10', () => {
    const profile = makeProfile({ threshold: 15, sensitivity: 25 })
    // base=150, range=250 → full at 400
    expect(calibrationService.calculateIntensity(400, profile)).toBe(100)
  })

  it('clamps above 100', () => {
    const profile = makeProfile({ threshold: 15, sensitivity: 25 })
    expect(calibrationService.calculateIntensity(2000, profile)).toBe(100)
  })

  it('mid-range value', () => {
    const profile = makeProfile({ threshold: 15, sensitivity: 25 })
    // base=150, range=250, mag=275 → (275-150)/250*100 = 50
    expect(calibrationService.calculateIntensity(275, profile)).toBe(50)
  })

  it('returns 0 when sensitivity is 0 (no division by zero crash)', () => {
    const profile = makeProfile({ sensitivity: 0 })
    expect(calibrationService.calculateIntensity(500, profile)).toBe(0)
  })
})
