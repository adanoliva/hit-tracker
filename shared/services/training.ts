import type { Training, Round, RoundStats, Impact, CalibrationProfile, Device } from '../types'
import { APP_VERSION } from '../constants'

export interface TrainingConfig {
  device: Device
  profile: CalibrationProfile
  roundDuration: number
  numRounds: number
  restDuration: number
}

function calcRoundStats(impacts: Impact[], duration: number): RoundStats {
  const totalImpacts = impacts.length
  const validHits = impacts.filter((i) => i.isValid).length
  const powerMax = impacts.reduce((max, i) => Math.max(max, i.intensity), 0)
  const durationMin = duration / 60000
  const hpmAverage = durationMin > 0 ? Math.round(totalImpacts / durationMin) : 0
  const powerTrend = impacts.map((i) => i.intensity)

  const firstHalf = powerTrend.slice(0, Math.floor(powerTrend.length / 2))
  const secondHalf = powerTrend.slice(Math.floor(powerTrend.length / 2))
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0
  const isFatigued = firstAvg > 0 && secondAvg < firstAvg * 0.85

  return {
    duration,
    totalImpacts,
    validHits,
    validHitRate: totalImpacts > 0 ? Math.round((validHits / totalImpacts) * 100) : 0,
    powerMax,
    hpmAverage,
    hpmMax: 0,
    powerTrend,
    isFatigued
  }
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
      validHits: 0,
      powerMax: 0,
      hpmAverage: 0
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

  finishRound(): Round | null {
    if (!this.currentRound || !this.current) return null

    const endTime = Date.now()
    const duration = endTime - this.currentRound.startTime
    const stats = calcRoundStats(this.currentRound.impacts, duration)

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
    this.current.validHits = allImpacts.filter((i) => i.isValid).length
    this.current.powerMax = allImpacts.reduce((max, i) => Math.max(max, i.intensity), 0)
    this.current.hpmAverage =
      durationMin > 0 ? Math.round(allImpacts.length / durationMin) : 0

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
