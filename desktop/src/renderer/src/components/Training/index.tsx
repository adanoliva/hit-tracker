import { useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { audioService } from '../../services/audio'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProfileStore } from '../../stores/profileStore'
import { useTrainingStore } from '../../stores/trainingStore'
import { useTraining } from '../../hooks/useTraining'
import { useSensorData } from '../../hooks/useSensorData'
import { trainingService } from '../../services/training'
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
  const getUserPowerMax = useTrainingStore((s) => s.getUserPowerMax)
  const userPowerRef = useRef(getUserPowerMax(profile.id))

  const { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset } = useSensorData(profile)
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

  // Campana en transiciones de fase (no en preparing→round, solo rest→round, round→resting/finished)
  const prevPhaseRef = useRef<string>('idle')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (phase === 'resting' || phase === 'finished') {
      audioService.bell()
    }
    if (phase === 'round' && prev === 'resting') {
      audioService.bell()
    }
  }, [phase])

  // Beeps countdown en preparación: 3→beep, 2→beep, 1→BEEP largo
  useEffect(() => {
    if (phase !== 'preparing') return
    if (prepTimeRemaining === 3 || prepTimeRemaining === 2) audioService.beep()
    if (prepTimeRemaining === 1) audioService.longBeep()
  }, [prepTimeRemaining, phase])

  // Timer countdown en los últimos 10s de ronda
  useEffect(() => {
    if (phase === 'round' && roundTimeRemaining === 10) audioService.countdown()
  }, [roundTimeRemaining, phase])

  // Beeps countdown en descanso: 3→beep, 2→beep, 1→BEEP largo
  useEffect(() => {
    if (phase !== 'resting') return
    if (restTimeRemaining === 3 || restTimeRemaining === 2) audioService.beep()
    if (restTimeRemaining === 1) audioService.longBeep()
  }, [restTimeRemaining, phase])

  // BLE sensor real: escuchar datos solo durante la ronda
  useEffect(() => {
    if (!connected || phase !== 'round') return
    let unlisten: (() => void) | null = null
    listen<{ ax: number; ay: number; az: number }>('ble-sensor-data', (e) => {
      const { ax, ay, az } = e.payload
      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
      processReading({ ax, ay, az, gx: 0, gy: 0, gz: 0, magnitude, timestamp: Date.now() })
    }).then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [phase, connected, processReading])

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
      powerMaxMag={powerMaxMag}
      userPowerRef={userPowerRef.current}
      hpmStats={hpmStats}
      onAbort={handleAbort}
      onFinish={finishCurrentRound}
    />
  )
}
