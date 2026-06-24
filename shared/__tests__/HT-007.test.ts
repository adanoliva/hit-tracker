import { calibrationService } from '../services/calibration'
import type { CalibrationProfile } from '../types'

function makeProfile(overrides: Partial<CalibrationProfile> = {}): CalibrationProfile {
  return { id: 'test', name: 'Test', threshold: 15, sensitivity: 25, createdAt: 0, ...overrides }
}

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
