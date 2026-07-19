import { calcCalories, boxingMetFromIntensity, estimateTrainingCalories } from '../../shared/services/calories'
import type { Training } from '../../shared/types'

describe('calories', () => {
  it('calcCalories: MET=8, 70kg, 1h → 560 kcal', () => {
    expect(calcCalories(8, 3_600_000, 70)).toBeCloseTo(560)
  })

  it('boxingMetFromIntensity: maps low/medium/high ranges', () => {
    expect(boxingMetFromIntensity(10)).toBe(6)
    expect(boxingMetFromIntensity(50)).toBe(8)
    expect(boxingMetFromIntensity(90)).toBe(10.5)
  })

  it('estimateTrainingCalories: backfills legacy trainings missing calories, leaves modern ones untouched', () => {
    const legacy = {
      id: 't1', createdAt: 0, device: { mac: '', name: '' },
      profile: { id: 'p1', name: 'Default', threshold: 15, sensitivity: 25, createdAt: 0, weightKg: 80 },
      roundDuration: 60, numRounds: 1, restDuration: 30, totalImpacts: 1, powerMax: 0, hpmAverage: 0,
      rounds: [{
        number: 1, startTime: 0, endTime: 3_600_000,
        impacts: [{ time: 0, intensity: 50, magnitude: 300, duration: 10 }],
        stats: { duration: 3_600_000, totalImpacts: 1, powerMax: 0, hpmAverage: 0, hpmMax: 0, powerTrend: [], isFatigued: false, isCadenceDropped: false }
      }]
    } as unknown as Training

    const result = estimateTrainingCalories(legacy)
    expect(result.calories).toBeCloseTo(640) // MET 8 (medium) x 80kg x 1h
    expect(result.rounds[0].stats.calories).toBeCloseTo(640)

    const modern = { ...legacy, calories: 123 } as Training
    expect(estimateTrainingCalories(modern)).toBe(modern)
  })
})
