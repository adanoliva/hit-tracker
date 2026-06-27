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
import { exerciseService } from '../../core/services/exerciseService'
import { TrainingSetup, type PhaseConfig } from './TrainingSetup'
import { TrainingRound } from './TrainingRound'
import { TrainingRest } from './TrainingRest'
import { TrainingResults } from './TrainingResults'
import { WorkoutPlayer } from '../Workout/WorkoutPlayer'
import { colors } from '../../theme'

type SessionPhase = 'setup' | 'warmup' | 'core' | 'boxing'

export function TrainingPage({ onBack }: { onBack?: () => void }) {
  const connected   = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const addTraining = useTrainingStore((s) => s.addTraining)
  const profile     = getSelected()

  const { top } = useSafeAreaInsets()
  const getUserPowerMax = useTrainingStore((s) => s.getUserPowerMax)
  const userPowerRef = useRef(getUserPowerMax(profile.id))

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('setup')
  const phaseConfigRef = useRef<PhaseConfig>({ includeWarmup: false, includeCore: false })
  const pendingBoxingRef = useRef<{ roundDuration: number; numRounds: number; restDuration: number } | null>(null)

  const { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset } = useSensorData(profile)
  const {
    phase, currentRoundNumber, totalRounds, roundTimeRemaining, roundTimeElapsed,
    restTimeRemaining, prepTimeRemaining, completedRounds, isFreeMode,
    finishedTraining, startTraining, abortTraining, finishCurrentRound, getPreviousRoundStats
  } = useTraining()

  const savedRef = useRef(false)

  useEffect(() => {
    if (phase !== 'idle') {
      activateKeepAwakeAsync()
    } else {
      deactivateKeepAwake()
    }
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

  // Campana en transiciones de fase
  const prevPhaseRef = useRef<string>('idle')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (phase === 'resting' || phase === 'finished') audioService.bell()
    if (phase === 'round' && prev === 'resting') audioService.bell()
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

  useEffect(() => {
    if (phase !== 'round' || impacts.length === 0) return
    trainingService.onImpactDetected(impacts[impacts.length - 1])
  }, [impacts, phase])

  useBleReading({
    deviceId: connected?.mac ?? null,
    active: phase === 'round',
    onReading: processReading
  })

  const startBoxingSession = () => {
    const p = pendingBoxingRef.current
    if (!p || !connected) return
    reset()
    startTraining(connected, profile, p.roundDuration, p.numRounds, p.restDuration)
  }

  const handleStart = (roundDuration: number, numRounds: number, restDuration: number, phases: PhaseConfig) => {
    if (!connected) return
    phaseConfigRef.current = phases
    pendingBoxingRef.current = { roundDuration, numRounds, restDuration }
    if (phases.includeWarmup) { setSessionPhase('warmup'); return }
    if (phases.includeCore)   { setSessionPhase('core');   return }
    setSessionPhase('boxing')
    reset()
    startTraining(connected, profile, roundDuration, numRounds, restDuration)
  }

  const handleWarmupComplete = () => {
    if (phaseConfigRef.current.includeCore) { setSessionPhase('core'); return }
    setSessionPhase('boxing')
    startBoxingSession()
  }

  const handleCoreComplete = () => {
    setSessionPhase('boxing')
    startBoxingSession()
  }

  const handlePhysicalAbort = () => {
    setSessionPhase('setup')
  }

  const handleAbort = () => {
    abortTraining()
    reset()
    setSessionPhase('setup')
  }

  if (finishedTraining) {
    return (
      <TrainingResults
        training={finishedTraining}
        onDone={() => { abortTraining(); reset(); setSessionPhase('setup'); onBack?.() }}
      />
    )
  }

  if (sessionPhase === 'setup' || phase === 'idle') {
    return <TrainingSetup onStart={handleStart} onBack={onBack ?? (() => {})} />
  }

  if (sessionPhase === 'warmup') {
    const routine = exerciseService.getRoutineById('warmup-boxing')
    if (!routine) return null
    return <WorkoutPlayer routine={routine} onComplete={handleWarmupComplete} onAbort={handlePhysicalAbort} />
  }

  if (sessionPhase === 'core') {
    const routine = exerciseService.getRoutineById('core-boxer')
    if (!routine) return null
    return <WorkoutPlayer routine={routine} onComplete={handleCoreComplete} onAbort={handlePhysicalAbort} />
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
    alignItems: 'center', justifyContent: 'center', gap: 16
  },
  prepLabel: { fontSize: 18, color: colors.textMuted },
  prepTimer: { fontSize: 96, fontFamily: 'monospace', fontWeight: '800', color: colors.accent },
  cancelText: { fontSize: 14, color: colors.textMuted }
})
