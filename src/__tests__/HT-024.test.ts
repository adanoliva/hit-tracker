import { trainingService } from '../../shared/services/training'
import type { Device, CalibrationProfile, Impact } from '../../shared/types'

// Lógica pura extraída de calcCadenceDropped (shared/services/training.ts)
// Duplicada aquí para los casos de borde granulares; el describe "integración"
// más abajo ejercita el código real vía trainingService para detectar drift.
const MIN_IMPACTS_FIRST_HALF = 4
const MIN_IMPACTS_SECOND_HALF = 2
const CADENCE_DROP_THRESHOLD = 0.7

function calcCadenceDropped(impacts: Array<{ time: number }>, duration: number): boolean {
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

describe('HT-024 — Aviso de bajada de ritmo (cadencia)', () => {
  describe('ritmo constante', () => {
    it('no marca isCadenceDropped si el ritmo se mantiene', () => {
      const impacts = Array.from({ length: 8 }, (_, i) => ({ time: i * 1000 }))
      expect(calcCadenceDropped(impacts, 8000)).toBe(false)
    })
  })

  describe('ritmo cae', () => {
    it('marca isCadenceDropped si la segunda mitad tiene muchos menos golpes/ms', () => {
      // primera mitad (0-4000ms): 8 golpes. segunda mitad (4000-8000ms): 2 golpes
      const first = Array.from({ length: 8 }, (_, i) => ({ time: i * 500 }))
      const second = [{ time: 5000 }, { time: 7000 }]
      expect(calcCadenceDropped([...first, ...second], 8000)).toBe(true)
    })
  })

  describe('ritmo sube', () => {
    it('no marca isCadenceDropped si la segunda mitad acelera', () => {
      const first = [{ time: 0 }, { time: 2000 }, { time: 3900 }, { time: 3950 }]
      const second = Array.from({ length: 8 }, (_, i) => ({ time: 4000 + i * 400 }))
      expect(calcCadenceDropped([...first, ...second], 8000)).toBe(false)
    })
  })

  describe('pocos golpes por mitad', () => {
    it('no dispara falso positivo con 1 golpe en cada mitad (bajo el mínimo)', () => {
      const impacts = [{ time: 0 }, { time: 7000 }]
      expect(calcCadenceDropped(impacts, 8000)).toBe(false)
    })

    it('no dispara falso positivo con primera mitad por debajo del mínimo', () => {
      const impacts = [{ time: 0 }, { time: 100 }, { time: 4500 }, { time: 4600 }, { time: 4700 }]
      expect(calcCadenceDropped(impacts, 8000)).toBe(false)
    })
  })

  describe('casos vacíos', () => {
    it('no marca isCadenceDropped sin golpes', () => {
      expect(calcCadenceDropped([], 8000)).toBe(false)
    })

    it('no marca isCadenceDropped con duration 0', () => {
      expect(calcCadenceDropped([{ time: 0 }, { time: 1000 }], 0)).toBe(false)
    })
  })

  describe('integración con trainingService (código real, no la copia local)', () => {
    const device: Device = { mac: 'AA:BB', name: 'Sensor', createdAt: 0, lastSeen: 0 }
    const profile: CalibrationProfile = { id: 'p1', name: 'Default', threshold: 15, sensitivity: 25, createdAt: 0 }

    function makeImpact(time: number): Impact {
      return { time, magnitude: 500, intensity: 0, duration: 0 }
    }

    it('finishRound() marca isCadenceDropped cuando el ritmo real cae', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)   // startTraining -> createdAt
        .mockReturnValueOnce(2000)   // startRound -> startTime
        .mockReturnValueOnce(10000)  // finishRound -> endTime (duration = 8000)

      trainingService.startTraining({ device, profile, roundDuration: 60, numRounds: 1, restDuration: 30 })
      trainingService.startRound(1)

      const first = Array.from({ length: 8 }, (_, i) => makeImpact(i * 500))
      const second = [makeImpact(5000), makeImpact(7000)]
      for (const impact of [...first, ...second]) trainingService.onImpactDetected(impact)

      const round = trainingService.finishRound()

      expect(round?.stats.isCadenceDropped).toBe(true)
      expect(round?.stats.isFatigued).toBe(false) // misma magnitud en todos los golpes: no hay caída de potencia

      jest.restoreAllMocks()
    })

    it('finishRound() no marca isCadenceDropped cuando el ritmo se mantiene', () => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(2000)
        .mockReturnValueOnce(10000)

      trainingService.startTraining({ device, profile, roundDuration: 60, numRounds: 1, restDuration: 30 })
      trainingService.startRound(1)

      const impacts = Array.from({ length: 8 }, (_, i) => makeImpact(i * 1000))
      for (const impact of impacts) trainingService.onImpactDetected(impact)

      const round = trainingService.finishRound()

      expect(round?.stats.isCadenceDropped).toBe(false)

      jest.restoreAllMocks()
    })
  })
})
