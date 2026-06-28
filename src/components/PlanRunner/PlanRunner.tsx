import { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import type { Exercise, ExerciseCategory, WorkoutPlan } from '../../core/types'
import type { ResolvedRoutine } from '../../core/hooks/useWorkoutPlayer'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useTraining } from '../../core/hooks/useTraining'
import { useSensorData } from '../../core/hooks/useSensorData'
import { useBleReading } from '../../core/hooks/useBleReading'
import { trainingService } from '../../core/services/trainingService'
import { exerciseService } from '../../core/services/exerciseService'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { audioService } from '../../services/audio'
import { WorkoutPlayer } from '../Workout/WorkoutPlayer'
import { TrainingRound } from '../Session/TrainingRound'
import { TrainingRest } from '../Session/TrainingRest'
import { TrainingResults } from '../Session/TrainingResults'
import { colors } from '../../theme'

type PlanPhase = 'warmup' | 'core' | 'boxing'

const DUMMY_DEVICE = { mac: '', name: 'Sin sensor', createdAt: 0, lastSeen: 0 }

function buildRoutine(ids: string[], name: string, category: ExerciseCategory, customs: Exercise[]): ResolvedRoutine {
  const resolvedExercises = ids
    .map((id) => exerciseService.getById(id) ?? customs.find((e) => e.id === id))
    .filter((e): e is Exercise => e !== undefined)
  return {
    id: 'dynamic',
    name,
    category,
    durationMin: 0,
    difficulty: 'medium',
    exercises: resolvedExercises.map((e) => ({ exerciseId: e.id })),
    resolvedExercises,
  }
}

function firstPhase(plan: WorkoutPlan): PlanPhase {
  if (plan.warmupExerciseIds.length > 0) return 'warmup'
  if (plan.coreExerciseIds.length > 0) return 'core'
  return 'boxing'
}

interface PlanRunnerProps {
  plan: WorkoutPlan
  onDone: () => void
  onAbort: () => void
}

export function PlanRunner({ plan, onDone, onAbort }: PlanRunnerProps) {
  const { top } = useSafeAreaInsets()
  const customExercises = useCustomExerciseStore((s) => s.exercises)
  const connected = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const addTraining = useTrainingStore((s) => s.addTraining)
  const getUserPowerMax = useTrainingStore((s) => s.getUserPowerMax)
  const profile = getSelected()
  const userPowerRef = useRef(getUserPowerMax(profile.id))

  const [planPhase, setPlanPhase] = useState<PlanPhase>(() => firstPhase(plan))

  const { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset } = useSensorData(profile)
  const {
    phase, currentRoundNumber, totalRounds, roundTimeRemaining, roundTimeElapsed,
    restTimeRemaining, prepTimeRemaining, completedRounds, isFreeMode,
    finishedTraining, startTraining, abortTraining, finishCurrentRound, getPreviousRoundStats
  } = useTraining()

  const savedRef = useRef(false)

  // Start boxing as soon as planPhase === 'boxing'
  useEffect(() => {
    if (planPhase !== 'boxing') return
    reset()
    savedRef.current = false
    startTraining(
      connected ?? DUMMY_DEVICE,
      profile,
      plan.boxing.roundDuration,
      plan.boxing.numRounds,
      plan.boxing.restDuration
    )
  }, [planPhase])

  useEffect(() => {
    if (finishedTraining && !savedRef.current) {
      savedRef.current = true
      addTraining(finishedTraining)
    }
  }, [finishedTraining])

  useEffect(() => {
    if (phase !== 'idle') activateKeepAwakeAsync()
    else deactivateKeepAwake()
    return () => { deactivateKeepAwake() }
  }, [phase])

  const prevPhaseRef = useRef<string>('idle')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (phase === 'resting' || phase === 'finished') audioService.bell()
    if (phase === 'round' && prev === 'resting') audioService.bell()
  }, [phase])

  useEffect(() => {
    if (phase !== 'preparing') return
    if (prepTimeRemaining === 3 || prepTimeRemaining === 2) audioService.beep()
    if (prepTimeRemaining === 1) audioService.longBeep()
  }, [prepTimeRemaining, phase])

  useEffect(() => {
    if (phase === 'round' && roundTimeRemaining === 10) audioService.countdown()
  }, [roundTimeRemaining, phase])

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
    active: planPhase === 'boxing' && phase === 'round',
    onReading: processReading,
  })

  const handleWarmupComplete = () => {
    if (plan.coreExerciseIds.length > 0) { setPlanPhase('core'); return }
    setPlanPhase('boxing')
  }

  const handleCoreComplete = () => setPlanPhase('boxing')

  const handlePhysicalAbort = () => onAbort()

  const handleBoxingAbort = () => {
    abortTraining()
    reset()
    onAbort()
  }

  // Physical phases
  if (planPhase === 'warmup') {
    const routine = buildRoutine(plan.warmupExerciseIds, 'Calentamiento', 'warmup', customExercises)
    return <WorkoutPlayer key="warmup" routine={routine} onComplete={handleWarmupComplete} onAbort={handlePhysicalAbort} />
  }

  if (planPhase === 'core') {
    const routine = buildRoutine(plan.coreExerciseIds, 'Core', 'core', customExercises)
    return <WorkoutPlayer key="core" routine={routine} onComplete={handleCoreComplete} onAbort={handlePhysicalAbort} />
  }

  // Boxing phase
  if (finishedTraining) {
    return (
      <TrainingResults
        training={finishedTraining}
        onDone={() => { abortTraining(); reset(); onDone() }}
      />
    )
  }

  if (phase === 'preparing') {
    return (
      <View style={[s.center, { paddingTop: top }]}>
        <Text style={s.prepLabel}>Prepárate...</Text>
        <Text style={s.prepTimer}>{prepTimeRemaining}</Text>
        <TouchableOpacity onPress={handleBoxingAbort}>
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

  // round or idle (waiting for boxing to start)
  const activeCombo = plan.boxing.roundScripts.find((s) => s.round === currentRoundNumber)?.combo

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
      onAbort={handleBoxingAbort}
      combo={activeCombo}
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
