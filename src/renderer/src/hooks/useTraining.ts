import { useState, useCallback, useRef, useEffect } from 'react'
import type { Device, CalibrationProfile, Round, RoundStats, Training } from '../types'
import { trainingService } from '../services/training'
import { useTrainingStore } from '../stores/trainingStore'

type TrainingPhase = 'idle' | 'preparing' | 'round' | 'resting' | 'finished'

interface UseTrainingReturn {
  phase: TrainingPhase
  currentRoundNumber: number
  totalRounds: number
  roundTimeRemaining: number
  roundTimeElapsed: number
  restTimeRemaining: number
  prepTimeRemaining: number
  completedRounds: Round[]
  finishedTraining: Training | null
  isFreeMode: boolean
  startTraining: (
    device: Device,
    profile: CalibrationProfile,
    roundDuration: number,
    numRounds: number,
    restDuration: number
  ) => void
  abortTraining: () => void
  finishCurrentRound: () => void
  getPreviousRoundStats: () => RoundStats | null
}

const PREP_DURATION = 10

export function useTraining(): UseTrainingReturn {
  const setActivePhase = useTrainingStore((s) => s.setActivePhase)
  const [phase, setPhase] = useState<TrainingPhase>('idle')
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1)
  const [totalRounds, setTotalRounds] = useState(3)
  const [roundTimeRemaining, setRoundTimeRemaining] = useState(0)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(PREP_DURATION)
  const [completedRounds, setCompletedRounds] = useState<Round[]>([])
  const [finishedTraining, setFinishedTraining] = useState<Training | null>(null)

  const [roundTimeElapsed, setRoundTimeElapsed] = useState(0)
  const configRef = useRef({ roundDuration: 180, numRounds: 3, restDuration: 60 })
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRest = useCallback((afterRound: number) => {
    setRestTimeRemaining(configRef.current.restDuration)
    setPhase('resting')

    timerRef.current = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()
          // startRound se llama en el siguiente tick para evitar capturar stale ref
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Cuando el descanso termina arrancamos la siguiente ronda
    setTimeout(() => {
      startRoundRef.current(afterRound + 1)
    }, configRef.current.restDuration * 1000)
  }, [])

  // Ref para evitar dependencias circulares entre startRound y startRest
  const startRoundRef = useRef<(n: number) => void>(() => {})

  const startRound = useCallback((roundNumber: number) => {
    setCurrentRoundNumber(roundNumber)
    setRoundTimeElapsed(0)
    setRoundTimeRemaining(configRef.current.roundDuration)
    setPhase('round')
    trainingService.startRound(roundNumber)

    const freeMode = configRef.current.roundDuration === 0

    if (freeMode) {
      timerRef.current = setInterval(() => {
        setRoundTimeElapsed((prev) => prev + 1)
      }, 1000)
      return
    }

    timerRef.current = setInterval(() => {
      setRoundTimeRemaining((prev) => {
        if (prev <= 1) {
          clearTimer()

          const round = trainingService.finishRound()
          if (round) {
            setCompletedRounds((prevRounds) => {
              const updated = [...prevRounds, round]

              if (updated.length >= configRef.current.numRounds) {
                const training = trainingService.finishTraining()
                if (training) setFinishedTraining(training)
                setPhase('finished')
              } else {
                startRest(roundNumber)
              }

              return updated
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [startRest])

  // Mantener la ref sincronizada
  useEffect(() => {
    startRoundRef.current = startRound
  }, [startRound])

  const startTraining = useCallback(
    (
      device: Device,
      profile: CalibrationProfile,
      roundDuration: number,
      numRounds: number,
      restDuration: number
    ) => {
      configRef.current = { roundDuration, numRounds, restDuration }
      setTotalRounds(numRounds)
      setCompletedRounds([])
      setCurrentRoundNumber(1)
      setPrepTimeRemaining(PREP_DURATION)
      setFinishedTraining(null)
      setPhase('preparing')

      trainingService.startTraining({ device, profile, roundDuration, numRounds, restDuration })

      timerRef.current = setInterval(() => {
        setPrepTimeRemaining((prev) => {
          if (prev <= 1) {
            clearTimer()
            startRound(1)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    },
    [startRound]
  )

  const abortTraining = useCallback(() => {
    clearTimer()
    trainingService.finishTraining()
    setPhase('idle')
    setCompletedRounds([])
    setFinishedTraining(null)
  }, [])

  const finishCurrentRound = useCallback(() => {
    clearTimer()
    const round = trainingService.finishRound()
    if (round) {
      setCompletedRounds((prev) => {
        const updated = [...prev, round]
        const training = trainingService.finishTraining()
        if (training) setFinishedTraining(training)
        setPhase('finished')
        return updated
      })
    }
  }, [])

  useEffect(() => () => clearTimer(), [])

  useEffect(() => { setActivePhase(phase) }, [phase])

  const getPreviousRoundStats = useCallback((): RoundStats | null => {
    return trainingService.getPreviousRoundStats(currentRoundNumber)
  }, [currentRoundNumber])

  return {
    phase,
    currentRoundNumber,
    totalRounds,
    roundTimeRemaining,
    roundTimeElapsed,
    restTimeRemaining,
    prepTimeRemaining,
    completedRounds,
    finishedTraining,
    isFreeMode: configRef.current.roundDuration === 0,
    startTraining,
    abortTraining,
    finishCurrentRound,
    getPreviousRoundStats
  }
}
