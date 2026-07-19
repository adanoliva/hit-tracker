import type { Training, Round, RoundStats, Impact, CalibrationProfile, Device } from '../types'
import { APP_VERSION } from '../constants'
import { DEFAULT_WEIGHT_KG, boxingMetFromIntensity, calcCalories, avgIntensity } from './calories'

export interface TrainingConfig {
  device: Device
  profile: CalibrationProfile
  roundDuration: number
  numRounds: number
  restDuration: number
}

function calcRoundStats(impacts: Impact[], duration: number, weightKg: number): RoundStats {
  const totalImpacts = impacts.length
  const powerMax = impacts.reduce((max, i) => Math.max(max, Math.round(i.magnitude ?? 0)), 0)
  const durationMin = duration / 60000
  const hpmAverage = durationMin > 0 ? Math.round(totalImpacts / durationMin) : 0
  const powerTrend = impacts.map((i) => Math.round(i.magnitude ?? 0))

  const calories = calcCalories(boxingMetFromIntensity(avgIntensity(impacts)), duration, weightKg)

  const firstHalf = powerTrend.slice(0, Math.floor(powerTrend.length / 2))
  const secondHalf = powerTrend.slice(Math.floor(powerTrend.length / 2))
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0
  const isFatigued = firstAvg > 0 && secondAvg < firstAvg * 0.85

  const isCadenceDropped = calcCadenceDropped(impacts, duration)

  return {
    duration,
    totalImpacts,
    powerMax,
    hpmAverage,
    hpmMax: 0,
    powerTrend,
    isFatigued,
    isCadenceDropped,
    calories
  }
}

// Impact.time viene del reloj del sensor BLE (millis() del ESP32), no de Date.now(),
// así que el punto medio se ancla en el primer golpe (mismo reloj) en vez de round.startTime.
const MIN_IMPACTS_FIRST_HALF = 4
const MIN_IMPACTS_SECOND_HALF = 2
const CADENCE_DROP_THRESHOLD = 0.7

function calcCadenceDropped(impacts: Impact[], duration: number): boolean {
  if (impacts.length === 0 || duration <= 0) return false

  const roundMidTime = impacts[0].time + duration / 2
  const firstHalf = impacts.filter((i) => i.time < roundMidTime)
  const secondHalf = impacts.filter((i) => i.time >= roundMidTime)

  if (firstHalf.length < MIN_IMPACTS_FIRST_HALF || secondHalf.length < MIN_IMPACTS_SECOND_HALF) return false

  const firstHalfDuration = roundMidTime - impacts[0].time
  const secondHalfDuration = impacts[0].time + duration - roundMidTime
  if (firstHalfDuration <= 0 || secondHalfDuration <= 0) return false

  const firstHalfRate = firstHalf.length / firstHalfDuration
  const secondHalfRate = secondHalf.length / secondHalfDuration

  return secondHalfRate < firstHalfRate * CADENCE_DROP_THRESHOLD
}

class TrainingService {
  private current: Training | null = null
  private currentRound: { number: number; startTime: number; impacts: Impact[] } | null = null

  startTraining(config: TrainingConfig): Training {
    const training: Training = {
      id: `training-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      createdAt: Date.now(),
      device: { mac: config.device.mac, name: config.device.name },
      profile: config.profile,
      rounds: [],
      roundDuration: config.roundDuration,
      numRounds: config.numRounds,
      restDuration: config.restDuration,
      totalImpacts: 0,
      powerMax: 0,
      hpmAverage: 0,
      calories: 0
    }
    this.current = training
    return training
  }

  startRound(roundNumber: number): void {
    this.currentRound = {
      number: roundNumber,
      startTime: Date.now(),
      impacts: []
    }
  }

  onImpactDetected(impact: Impact): void {
    if (this.currentRound) {
      this.currentRound.impacts.push(impact)
    }
  }

  finishRound(plannedDurationMs?: number): Round | null {
    if (!this.currentRound || !this.current) return null

    const endTime = Date.now()
    const duration = plannedDurationMs ?? (endTime - this.currentRound.startTime)
    const weightKg = this.current.profile.weightKg ?? DEFAULT_WEIGHT_KG
    const stats = calcRoundStats(this.currentRound.impacts, duration, weightKg)

    const round: Round = {
      number: this.currentRound.number,
      startTime: this.currentRound.startTime,
      endTime,
      impacts: this.currentRound.impacts,
      stats
    }

    this.current.rounds.push(round)
    this.currentRound = null
    return round
  }

  finishTraining(): Training | null {
    if (!this.current) return null

    const allImpacts = this.current.rounds.flatMap((r) => r.impacts)
    const totalDurationMs = this.current.rounds.reduce((sum, r) => sum + r.stats.duration, 0)
    const durationMin = totalDurationMs / 60000

    this.current.totalImpacts = allImpacts.length
    this.current.powerMax = allImpacts.reduce((max, i) => Math.max(max, Math.round(i.magnitude ?? 0)), 0)
    this.current.hpmAverage =
      durationMin > 0 ? Math.round(allImpacts.length / durationMin) : 0
    this.current.calories = this.current.rounds.reduce((sum, r) => sum + r.stats.calories, 0)

    this.current.appVersion = APP_VERSION
    const training = this.current
    this.current = null
    return training
  }

  getCurrentTraining(): Training | null {
    return this.current
  }

  getCurrentRoundImpacts(): Impact[] {
    return this.currentRound?.impacts ?? []
  }

  getPreviousRoundStats(roundNumber: number): RoundStats | null {
    if (!this.current || roundNumber < 2) return null
    const prev = this.current.rounds.find((r) => r.number === roundNumber - 1)
    return prev?.stats ?? null
  }
}

export const trainingService = new TrainingService()
