import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useTraining } from '../../core/hooks/useTraining'
import { useSensorData } from '../../core/hooks/useSensorData'
import { usePhoneSensor } from '../../core/hooks/usePhoneSensor'
import { trainingService } from '../../core/services/trainingService'
import { PHONE_SENSOR_ID } from '../../core/types'
import type { PhoneSensorPlacement } from '../../core/types'
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

  const isPhoneSensor = connected?.mac === PHONE_SENSOR_ID
  const phonePlacement = (connected as any)?.placement as PhoneSensorPlacement | undefined

  const { top } = useSafeAreaInsets()
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

  useEffect(() => {
    if (phase !== 'round' || impacts.length === 0) return
    trainingService.onImpactDetected(impacts[impacts.length - 1])
  }, [impacts, phase])

  // [solo mobile] Modo Todo en 1: el propio móvil actúa como sensor
  usePhoneSensor({
    placement: phonePlacement ?? 'front-vertical',
    active: isPhoneSensor && phase === 'round',
    onReading: processReading
  })

  // TODO: BLE externo (ESP32) — cuando phase === 'round' y !isPhoneSensor,
  // suscribirse a la característica GATT y llamar processReading() por notificación

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
        onDone={() => { abortTraining(); reset(); onBack?.() }}
      />
    )
  }

  if (phase === 'idle') {
    return <TrainingSetup onStart={handleStart} onBack={onBack ?? (() => {})} />
  }

  if (phase === 'preparing') {
    return (
      <View style={[s.center, { paddingTop: top }]}>
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
