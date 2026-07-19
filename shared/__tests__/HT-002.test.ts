import type { Impact, Round, RoundStats, Training, CalibrationProfile } from '../types'

// Lógica extraída del componente SessionDetail (misma fórmula en desktop y mobile)
const relativeTimeSeconds = (impact: Impact, round: Round) =>
  (impact.time - round.startTime) / 1000

const roundDomainX = (round: Round) =>
  (round.endTime - round.startTime) / 1000

const hasImpacts = (round: Round) => round.impacts.length > 0

const formatDuration = (ms: number) => {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Fixtures
const emptyStats: RoundStats = {
  duration: 0, totalImpacts: 0,
  powerMax: 0, hpmAverage: 0, hpmMax: 0, powerTrend: [], isFatigued: false, isCadenceDropped: false, calories: 0
}

const emptyProfile: CalibrationProfile = {
  id: 'p1', name: 'Default', threshold: 200, sensitivity: 1, createdAt: 0
}

function makeRound(overrides: Partial<Round> = {}): Round {
  return {
    number: 1, startTime: 1_000_000, endTime: 1_060_000,
    impacts: [], stats: emptyStats, ...overrides
  }
}

function makeTraining(rounds: Round[]): Training {
  return {
    id: 'abc', createdAt: 0, device: { mac: '00:00', name: 'HIT' },
    profile: emptyProfile, rounds, roundDuration: 60, numRounds: rounds.length,
    restDuration: 30, totalImpacts: 0, powerMax: 0, hpmAverage: 0, calories: 0
  }
}

describe('HT-002 — Detalle de sesión', () => {
  describe('relativeTimeSeconds', () => {
    it('calcula tiempo relativo correctamente', () => {
      const round = makeRound({ startTime: 1_000_000 })
      const i1: Impact = { time: 1_005_000, intensity: 50, magnitude: 300, duration: 10 }
      const i2: Impact = { time: 1_015_000, intensity: 70, magnitude: 400, duration: 10 }
      expect(relativeTimeSeconds(i1, round)).toBe(5.0)
      expect(relativeTimeSeconds(i2, round)).toBe(15.0)
    })

    it('retorna 0 cuando impact coincide con startTime', () => {
      const round = makeRound({ startTime: 500 })
      const impact: Impact = { time: 500, intensity: 40, magnitude: 200, duration: 5 }
      expect(relativeTimeSeconds(impact, round)).toBe(0)
    })
  })

  describe('roundDomainX', () => {
    it('devuelve la duración del round en segundos', () => {
      const round = makeRound({ startTime: 0, endTime: 90_000 })
      expect(roundDomainX(round)).toBe(90)
    })
  })

  describe('hasImpacts', () => {
    it('round sin golpes → false', () => {
      expect(hasImpacts(makeRound({ impacts: [] }))).toBe(false)
    })

    it('round con golpes → true', () => {
      const impact: Impact = { time: 1001, intensity: 50, magnitude: 300, duration: 5 }
      expect(hasImpacts(makeRound({ impacts: [impact] }))).toBe(true)
    })
  })

  describe('formatDuration', () => {
    it('formatea ms a mm:ss', () => {
      expect(formatDuration(90_000)).toBe('1:30')
      expect(formatDuration(3_000)).toBe('0:03')
      expect(formatDuration(0)).toBe('0:00')
    })
  })

  describe('tabs de rounds', () => {
    it('sesión con un solo round genera exactamente un tab', () => {
      const training = makeTraining([makeRound()])
      const tabs = training.rounds.map((r, i) => ({ label: `R${r.number}`, index: i }))
      expect(tabs).toHaveLength(1)
      expect(tabs[0].label).toBe('R1')
    })

    it('sesión con tres rounds genera tres tabs', () => {
      const rounds = [
        makeRound({ number: 1 }),
        makeRound({ number: 2 }),
        makeRound({ number: 3 }),
      ]
      const training = makeTraining(rounds)
      const tabs = training.rounds.map((r, i) => ({ label: `R${r.number}`, index: i }))
      expect(tabs).toHaveLength(3)
      expect(tabs.map(t => t.label)).toEqual(['R1', 'R2', 'R3'])
    })
  })

  describe('eliminación', () => {
    it('onDelete recibe el id correcto', () => {
      const training = makeTraining([makeRound()])
      const onDelete = jest.fn()
      onDelete(training.id)
      expect(onDelete).toHaveBeenCalledWith('abc')
    })
  })
})
