import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useTraining } from '../../core/hooks/useTraining'
import { useSensorData } from '../../core/hooks/useSensorData'
import { trainingService } from '../../core/services/trainingService'
import { TrainingSetup } from './TrainingSetup'
import { TrainingRound } from './TrainingRound'
import { TrainingRest } from './TrainingRest'
import { TrainingResults } from './TrainingResults'
import { colors } from '../../theme'

export function TrainingPage({ onBack }: { onBack?: () => void }) {
  const connected   = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const addTraining = useTrainingStore((s) => s.addTraining)
  const profile     = getSelected()

  const { impacts, powerMax, rpmStats, processReading, reset } = useSensorData(profile)
  const {
    phase, currentRoundNumber, totalRounds, roundTimeRemaining,
    restTimeRemaining, prepTimeRemaining, completedRounds,
    finishedTraining, startTraining, abortTraining, getPreviousRoundStats
  } = useTraining()

  const savedRef = useRef(false)

  useEffect(() => {
    if (finishedTraining && !savedRef.current) {
      savedRef.current = true
      addTraining(finishedTraining)
    }
  }, [finishedTraining])

  useEffect(() => {
    if (phase === 'preparing') savedRef.current = false
  }, [phase])

  // Registrar impactos en el servicio de entrenamiento
  useEffect(() => {
    if (phase !== 'round' || impacts.length === 0) return
    trainingService.onImpactDetected(impacts[impacts.length - 1])
  }, [impacts, phase])

  // TODO: conectar BLE real con react-native-ble-plx
  // cuando phase === 'round', suscribirse a la característica del sensor
  // y llamar processReading(parsedSensorReading) por cada notificación

  const handleStart = (roundDuration: number, numRounds: number, restDuration: number) => {
    if (!connected) return
    reset()
    startTraining(connected, profile, roundDuration, numRounds, restDuration)
  }

  const handleAbort = () => {
    abortTraining()
    reset()
  }

  if (finishedTraining) {
    return (
      <TrainingResults
        training={finishedTraining}
        onDone={() => { reset(); onBack?.() }}
      />
    )
  }

  if (phase === 'idle') {
    return <TrainingSetup onStart={handleStart} onBack={onBack ?? (() => {})} />
  }

  if (phase === 'preparing') {
    return (
      <View style={s.center}>
        <Text style={s.prepLabel}>Prepárate...</Text>
        <Text style={s.prepTimer}>{prepTimeRemaining}</Text>
        <TouchableOpacity onPress={handleAbort}>
          <Text style={s.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
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
      impacts={impacts}
      powerMax={powerMax}
      rpmStats={rpmStats}
      onAbort={handleAbort}
    />
  )
}

const s = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: colors.bgPrimary,
    alignItems: 'center', justifyContent: 'center', gap: 16
  },
  prepLabel: { fontSize: 18, color: colors.textMuted },
  prepTimer: { fontSize: 96, fontFamily: 'monospace', fontWeight: '800', color: colors.accent },
  cancelText: { fontSize: 14, color: colors.textMuted }
})
