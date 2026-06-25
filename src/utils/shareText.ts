import type { Training } from '../core/types'

export function generateShareText(training: Training): string {
  const totalMs = training.rounds.reduce((acc, r) => acc + r.stats.duration, 0)
  const minutes = Math.round(totalMs / 60000)
  const durationStr = minutes === 0 ? '< 1 min' : `${minutes} min`
  const hpm = Math.round(training.hpmAverage)
  return `¡Vaya sesión! ${durationStr} y una media de ${hpm} HPM. ¡A tope! 💪\n#hittracker #boxing #training`
}
