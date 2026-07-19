import type { Impact, Training } from '../types'

export const DEFAULT_WEIGHT_KG = 70
export const MET_WARMUP = 3.5
export const MET_CORE = 6
const MET_BOXING = { low: 6, medium: 8, high: 10.5 }

export function boxingMetFromIntensity(avgIntensity: number): number {
  if (avgIntensity < 33) return MET_BOXING.low
  if (avgIntensity < 66) return MET_BOXING.medium
  return MET_BOXING.high
}

export function calcCalories(met: number, durationMs: number, weightKg: number): number {
  return met * weightKg * (durationMs / 3_600_000)
}

export function avgIntensity(impacts: Impact[]): number {
  return impacts.length > 0 ? impacts.reduce((sum, i) => sum + (i.intensity ?? 0), 0) / impacts.length : 0
}

// ponytail: retroactive estimate for trainings saved before calories were tracked —
// only boxing rounds can be recovered (warmup/core duration was never persisted).
export function estimateTrainingCalories(training: Training): Training {
  if (training.calories !== undefined) return training

  const weightKg = training.profile.weightKg ?? DEFAULT_WEIGHT_KG
  const rounds = training.rounds.map((round) => {
    if (round.stats.calories !== undefined) return round
    const met = boxingMetFromIntensity(avgIntensity(round.impacts))
    return { ...round, stats: { ...round.stats, calories: calcCalories(met, round.stats.duration, weightKg) } }
  })

  return { ...training, rounds, calories: rounds.reduce((sum, r) => sum + r.stats.calories, 0) }
}
