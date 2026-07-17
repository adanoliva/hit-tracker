import { useEffect, useRef, useState } from 'react'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { audioService } from '../../services/audio'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useTraining } from '../../core/hooks/useTraining'
import { useSensorData } from '../../core/hooks/useSensorData'
import { useBleReading } from '../../core/hooks/useBleReading'
import { trainingService } from '../../core/services/trainingService'
import { TrainingSetup } from './TrainingSetup'
import { TrainingRound } from './TrainingRound'
import { TrainingRest } from './TrainingRest'
import { TrainingResults } from './TrainingResults'
import { colors } from '../../theme'

export function TrainingPage({ onBack }: { onBack?: () => void }) {
  const connected    = useDeviceStore((s) => s.connected)
  const getSelected  = useProfileStore((s) => s.getSelected)
  const addTraining  = useTrainingStore((s) => s.addTraining)
  const getUserPowerMax = useTrainingStore((s) => s.getUserPowerMax)
  const profile      = getSelected()
  const { top }      = useSafeAreaInsets()
  const userPowerRef = useRef(getUserPowerMax(profile.id))

  const [active, setActive] = useState(false)

  const { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset } = useSensorData(profile)
  const {
    phase, currentRoundNumber, totalRounds, roundTimeRemaining, roundTimeElapsed,
    restTimeRemaining, prepTimeRemaining, completedRounds, isFreeMode,
    finishedTraining, startTraining, abortTraining, finishCurrentRound, getPreviousRoundStats
  } = useTraining()

  const savedRef = useRef(false)

  useEffect(() => {
    if (phase !== 'idle') activateKeepAwakeAsync()
    else deactivateKeepAwake()
    return () => { deactivateKeepAwake() }
  }, [phase])

  useEffect(() => {
    if (finishedTraining && !savedRef.current) {
      savedRef.current = true
      addTraining(finishedTraining)
    }
  }, [finishedTraining])

  useEffect(() => {
    if (phase === 'preparing') savedRef.current = false
  }, [phase])

  const prevPhaseRef = useRef<string>('idle')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (phase === 'resting') audioService.twoBell()
    if (phase === 'finished') audioService.threeBell()
    if (phase === 'round' && prev === 'resting') audioService.oneBell()
  }, [phase])

  useEffect(() => {
    if (phase !== 'preparing') return
    if (prepTimeRemaining === 3 || prepTimeRemaining === 2 || prepTimeRemaining === 1) audioService.beep()
  }, [prepTimeRemaining, phase])

  useEffect(() => {
    if (phase !== 'round') return
    if (roundTimeRemaining >= 2 && roundTimeRemaining <= 10) audioService.countdownTick()
    if (roundTimeRemaining === 1) audioService.countdownEnd()
  }, [roundTimeRemaining, phase])

  useEffect(() => {
    if (phase !== 'resting') return
    if (restTimeRemaining === 3 || restTimeRemaining === 2 || restTimeRemaining === 1) audioService.beep()
  }, [restTimeRemaining, phase])

  useEffect(() => {
    if (phase !== 'round' || impacts.length === 0) return
    const lastImpact = impacts[impacts.length - 1]
    trainingService.onImpactDetected(lastImpact)
    if (userPowerRef.current > 0 && lastImpact.magnitude > userPowerRef.current) audioService.beep()
  }, [impacts, phase])

  useBleReading({
    deviceId: connected?.mac ?? null,
    active: phase === 'round',
    onReading: processReading,
  })

  const handleStart = (roundDuration: number, numRounds: number, restDuration: number) => {
    if (!connected) return
    reset()
    savedRef.current = false
    setActive(true)
    startTraining(connected, profile, roundDuration, numRounds, restDuration)
  }

  const handleAbort = () => {
    abortTraining()
    reset()
    setActive(false)
  }

  if (finishedTraining) {
    return (
      <TrainingResults
        training={finishedTraining}
        onDone={() => { abortTraining(); reset(); setActive(false); onBack?.() }}
      />
    )
  }

  if (!active || phase === 'idle') {
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
      powerMaxMag={powerMaxMag}
      userPowerRef={userPowerRef.current}
      timeElapsed={roundTimeElapsed}
      isFreeMode={isFreeMode}
      onFinish={finishCurrentRound}
      hpmStats={hpmStats}
      onAbort={handleAbort}
    />
  )
}

const s = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: colors.bgPrimary,
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  prepLabel: { fontSize: 18, color: colors.textMuted },
  prepTimer: { fontSize: 96, fontFamily: 'monospace', fontWeight: '800', color: colors.accent },
  cancelText: { fontSize: 14, color: colors.textMuted },
})
