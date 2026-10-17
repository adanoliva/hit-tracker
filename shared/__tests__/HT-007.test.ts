import { calibrationService } from '../services/calibration'
import type { CalibrationProfile, HitWindow } from '../types'

function makeProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return { id: 'test', name: 'Test', threshold: 15, sensitivity: 25, createdAt: 0, ...overrides }
}

function makeWindows(peaks: number[], rebound = 300): HitWindow[] {
  return peaks.map((peak) => ({ peak, rebound, reboundMax: peak * 0.3 }))
}

describe('HT-014 — analyzeCalibrationWindows', () => {
  it('calculates threshold, sensitivity and rebound for well-differentiated punches', () => {
    const light = makeWindows([250, 260, 240], 280)
    const heavy = makeWindows([900, 950, 920], 420)
    const result = calibrationService.analyzeCalibrationWindows(light, heavy)
    expect(result).not.toBeNull()
    // lightAvg=250, heavyAvg=923.33, base=200, range=723.33, threshold=20, sensitivity=72.3
    expect(result!.suggestedThreshold).toBeCloseTo(20, 0)
    expect(result!.suggestedSensitivity).toBeCloseTo(72.3, 1)
    // rebound: max(280,420) + 80 = 500
    expect(result!.suggestedRebound).toBe(500)
  })

  it('returns null when heavy is not sufficiently stronger than light', () => {
    const light = makeWindows([300, 310, 290])
    const heavy = makeWindows([320, 330, 310])
    expect(calibrationService.analyzeCalibrationWindows(light, heavy)).toBeNull()
  })

  it('clamps extreme values within slider range (1-100)', () => {
    const light = makeWindows([400, 420, 380])
    const heavy = makeWindows([2500, 2600, 2400])
    const result = calibrationService.analyzeCalibrationWindows(light, heavy)
    expect(result).not.toBeNull()
    expect(result!.suggestedThreshold).toBeGreaterThanOrEqual(0)
    expect(result!.suggestedThreshold).toBeLessThanOrEqual(100)
    expect(result!.suggestedSensitivity).toBeGreaterThanOrEqual(1)
    expect(result!.suggestedSensitivity).toBeLessThanOrEqual(100)
  })

  it('clamps rebound between 200ms and 700ms', () => {
    const light = makeWindows([300, 310, 290], 50)   // very short rebound
    const heavy = makeWindows([900, 950, 920], 1000)  // very long rebound
    const result = calibrationService.analyzeCalibrationWindows(light, heavy)
    expect(result!.suggestedRebound).toBe(700)  // clamped at max
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
