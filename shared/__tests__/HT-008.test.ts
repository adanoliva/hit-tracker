import type { Training, CalibrationProfile } from '../types'

// Lógica pura extraída de trainingStore.getUserPowerMax
function getUserPowerMax(trainings: Training[], profileId: string): number {
  const sessions = trainings.filter((t) => t.profile?.id === profileId).slice(0, 5)
  if (sessions.length === 0) return 0
  return Math.round(sessions.reduce((sum, t) => sum + t.powerMax, 0) / sessions.length)
}

function makeTraining(profileId: string, powerMax: number): Training {
  const profile: CalibrationProfile = {
    id: profileId, name: 'Test', threshold: 15, sensitivity: 25, validHitThreshold: 80, createdAt: 0
  }
  return {
    id: `t-${Math.random()}`, createdAt: 0,
    device: { mac: 'AA:BB', name: 'Sensor' },
    profile, rounds: [], roundDuration: 0, numRounds: 0,
    restDuration: 0, totalImpacts: 0, validHits: 0,
    powerMax, hpmAverage: 0
  }
}

describe('HT-008 — Power máximo del usuario (media últimas 5 sesiones)', () => {
  describe('media de 5 sesiones', () => {
    it('should return rounded average of last 5 when more than 5 exist', () => {
      // [60,70,80,90,100] son las 5 más recientes; [50,40] se ignoran
      const trainings = [60, 70, 80, 90, 100, 50, 40].map((p) => makeTraining('A', p))
      expect(getUserPowerMax(trainings, 'A')).toBe(80)
    })
  })

  describe('menos de 5 sesiones', () => {
    it('should average all available sessions when fewer than 5', () => {
      const trainings = [50, 60, 70].map((p) => makeTraining('A', p))
      expect(getUserPowerMax(trainings, 'A')).toBe(60)
    })
  })

  describe('sin sesiones', () => {
    it('should return 0 when no sessions exist for profile', () => {
      expect(getUserPowerMax([], 'A')).toBe(0)
    })

    it('should return 0 when sessions exist but none match the profile', () => {
      const trainings = [makeTraining('B', 80), makeTraining('B', 90)]
      expect(getUserPowerMax(trainings, 'A')).toBe(0)
    })
  })

  describe('filtrado por perfil', () => {
    it('should ignore sessions from other profiles', () => {
      const trainings = [
        makeTraining('A', 80), makeTraining('A', 90), makeTraining('A', 100),
        makeTraining('B', 10), makeTraining('B', 20), makeTraining('B', 30)
      ]
      expect(getUserPowerMax(trainings, 'A')).toBe(90)
    })
  })

  describe('borde: powerMax = 0', () => {
    it('should include sessions with powerMax 0 in average', () => {
      const trainings = [makeTraining('A', 0), makeTraining('A', 100)]
      expect(getUserPowerMax(trainings, 'A')).toBe(50)
    })
  })

  describe('redondeo', () => {
    it('should round to nearest integer', () => {
      // (10 + 20) / 2 = 15.0 → 15
      const trainings = [makeTraining('A', 10), makeTraining('A', 20)]
      expect(getUserPowerMax(trainings, 'A')).toBe(15)
    })

    it('should round 0.5 up', () => {
      // (10 + 11) / 2 = 10.5 → 11
      const trainings = [makeTraining('A', 10), makeTraining('A', 11)]
      expect(getUserPowerMax(trainings, 'A')).toBe(11)
    })
  })
})
