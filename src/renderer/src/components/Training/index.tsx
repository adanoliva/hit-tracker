import { useEffect, useRef } from 'react'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProfileStore } from '../../stores/profileStore'
import { useTrainingStore } from '../../stores/trainingStore'
import { useTraining } from '../../hooks/useTraining'
import { useSensorData } from '../../hooks/useSensorData'
import { trainingService } from '../../services/training'
import { mockSensorConnection, MOCK_DEVICE_ID } from '../../services/mockSensor'
import { TrainingSetup } from './TrainingSetup'
import { TrainingRound } from './TrainingRound'
import { TrainingRest } from './TrainingRest'
import { TrainingResults } from './TrainingResults'

interface TrainingPageProps {
  onBack: () => void
}

export function TrainingPage({ onBack }: TrainingPageProps): JSX.Element {
  const connected  = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const addTraining = useTrainingStore((s) => s.addTraining)

  const profile = getSelected()
  const isMock  = connected?.mac === MOCK_DEVICE_ID

  const { impacts, powerMax, hpmStats, processReading, reset } = useSensorData(profile, connected?.placement)
  const {
    phase,
    currentRoundNumber,
    totalRounds,
    roundTimeRemaining,
    roundTimeElapsed,
    restTimeRemaining,
    prepTimeRemaining,
    completedRounds,
    finishedTraining,
    isFreeMode,
    startTraining,
    abortTraining,
    finishCurrentRound,
    getPreviousRoundStats
  } = useTraining()

  // Persiste y muestra resultados cuando el hook señala que ha terminado
  const savedRef = useRef(false)
  useEffect(() => {
    if (finishedTraining && !savedRef.current) {
      savedRef.current = true
      addTraining(finishedTraining)
    }
  }, [finishedTraining])

  // Resetea el flag cuando se empieza un nuevo entrenamiento
  useEffect(() => {
    if (phase === 'preparing') savedRef.current = false
  }, [phase])

  // Mock sensor: conectar/desconectar según la fase
  useEffect(() => {
    if (!isMock) return
    if (phase === 'round') {
      mockSensorConnection.connect(processReading)
    } else {
      mockSensorConnection.disconnect()
    }
    return () => mockSensorConnection.disconnect()
  }, [phase, isMock, processReading])

  // Registrar impactos en el servicio de entrenamiento
  useEffect(() => {
    if (phase !== 'round' || impacts.length === 0) return
    const last = impacts[impacts.length - 1]
    trainingService.onImpactDetected(last)
  }, [impacts, phase])

  const handleStart = (roundDuration: number, numRounds: number, restDuration: number) => {
    if (!connected) return
    reset()
    startTraining(connected, profile, roundDuration, numRounds, restDuration)
  }

  const handleAbort = () => {
    abortTraining()
    reset()
  }

  // Pantalla de resultados
  if (finishedTraining) {
    return (
      <TrainingResults
        training={finishedTraining}
        onDone={() => {
          reset()
          onBack()
        }}
      />
    )
  }

  if (phase === 'idle') {
    return <TrainingSetup onStart={handleStart} onBack={onBack} />
  }

  if (phase === 'preparing') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-bg-primary">
        <p className="text-text-muted text-lg">Prepárate...</p>
        <p className="text-8xl font-mono font-bold text-accent">{prepTimeRemaining}</p>
        <button onClick={handleAbort} className="text-sm text-text-muted hover:text-accent transition-colors">
          Cancelar
        </button>
      </div>
    )
  }

  if (phase === 'resting') {
    const lastRound = completedRounds[completedRounds.length - 1]
    return (
      <TrainingRest
        restTimeRemaining={restTimeRemaining}
        currentRound={currentRoundNumber}
        totalRounds={totalRounds}
        roundStats={lastRound?.stats ?? null}
        previousRoundStats={getPreviousRoundStats()}
      />
    )
  }

  return (
    <TrainingRound
      roundNumber={currentRoundNumber}
      totalRounds={totalRounds}
      timeRemaining={roundTimeRemaining}
      timeElapsed={roundTimeElapsed}
      isFreeMode={isFreeMode}
      impacts={impacts}
      powerMax={powerMax}
      hpmStats={hpmStats}
      onAbort={handleAbort}
      onFinish={finishCurrentRound}
    />
  )
}
