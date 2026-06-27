import { useState, useEffect, useRef, useCallback } from 'react'
import type { Exercise, Routine, RoutineExercise } from '@shared/types'

export type ResolvedRoutine = Routine & { resolvedExercises: Exercise[] }

type Phase = 'exercise' | 'rest'

interface WorkoutState {
  exerciseIndex: number
  setIndex: number
  phase: Phase
  timeLeft: number | null  // null = reps mode
  skipped: string[]
}

interface WorkoutPlayerControls {
  currentExercise: Exercise | null
  resolvedExercise: RoutineExercise | null
  phase: Phase
  timeLeft: number | null
  setIndex: number
  totalSets: number
  progress: number  // 0-1
  skipped: string[]
  isDone: boolean
  advance: () => void   // for reps: done button
  skip: () => void
}

function getEffective(re: RoutineExercise, ex: Exercise) {
  return {
    sets: re.sets ?? 1,
    duration: re.duration ?? ex.duration,
    reps: re.reps ?? ex.reps,
    rest: ex.rest,
  }
}

export function useWorkoutPlayer(
  routine: ResolvedRoutine,
  onComplete: (skipped: string[]) => void,
  onAbort: () => void
): WorkoutPlayerControls & { abort: () => void } {
  const total = routine.resolvedExercises.length

  const [state, setState] = useState<WorkoutState>(() => {
    if (total === 0) return { exerciseIndex: 0, setIndex: 0, phase: 'exercise', timeLeft: null, skipped: [] }
    const ex = routine.resolvedExercises[0]
    const re = routine.exercises[0]
    const eff = getEffective(re, ex)
    return {
      exerciseIndex: 0,
      setIndex: 0,
      phase: 'exercise',
      timeLeft: eff.duration ?? null,
      skipped: [],
    }
  })

  const doneRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  // Called when finished with current exercise (after last set's rest)
  const advance = useCallback(() => {
    setState((prev) => {
      const { exerciseIndex, setIndex, phase, skipped } = prev
      if (exerciseIndex >= total) return prev

      const ex = routine.resolvedExercises[exerciseIndex]
      const re = routine.exercises[exerciseIndex]
      const eff = getEffective(re, ex)

      if (phase === 'exercise') {
        // Go to rest phase
        return { ...prev, phase: 'rest', timeLeft: eff.rest }
      }

      // phase === 'rest': next set or next exercise
      const nextSet = setIndex + 1
      if (nextSet < eff.sets) {
        return { ...prev, setIndex: nextSet, phase: 'exercise', timeLeft: eff.duration ?? null }
      }

      // Next exercise
      const nextIdx = exerciseIndex + 1
      if (nextIdx >= total) {
        doneRef.current = true
        return { ...prev, exerciseIndex: nextIdx, phase: 'exercise', timeLeft: null }
      }
      const nextEx = routine.resolvedExercises[nextIdx]
      const nextRe = routine.exercises[nextIdx]
      const nextEff = getEffective(nextRe, nextEx)
      return { exerciseIndex: nextIdx, setIndex: 0, phase: 'exercise', timeLeft: nextEff.duration ?? null, skipped }
    })
  }, [routine, total])

  const skip = useCallback(() => {
    setState((prev) => {
      const { exerciseIndex, phase, skipped } = prev
      if (exerciseIndex >= total) return prev
      const ex = routine.resolvedExercises[exerciseIndex]

      if (phase === 'rest') {
        // skip rest → go to next set or next exercise
        const re = routine.exercises[exerciseIndex]
        const eff = getEffective(re, ex)
        const nextSet = prev.setIndex + 1
        if (nextSet < eff.sets) {
          return { ...prev, setIndex: nextSet, phase: 'exercise', timeLeft: eff.duration ?? null }
        }
        const nextIdx = exerciseIndex + 1
        if (nextIdx >= total) {
          doneRef.current = true
          return { ...prev, exerciseIndex: nextIdx, phase: 'exercise', timeLeft: null }
        }
        const nextEx = routine.resolvedExercises[nextIdx]
        const nextRe = routine.exercises[nextIdx]
        const nextEff = getEffective(nextRe, nextEx)
        return { exerciseIndex: nextIdx, setIndex: 0, phase: 'exercise', timeLeft: nextEff.duration ?? null, skipped }
      }

      // skip exercise: add to skipped, jump to next
      const newSkipped = skipped.includes(ex.id) ? skipped : [...skipped, ex.id]
      const nextIdx = exerciseIndex + 1
      if (nextIdx >= total) {
        doneRef.current = true
        return { ...prev, exerciseIndex: nextIdx, phase: 'exercise', timeLeft: null, skipped: newSkipped }
      }
      const nextEx = routine.resolvedExercises[nextIdx]
      const nextRe = routine.exercises[nextIdx]
      const nextEff = getEffective(nextRe, nextEx)
      return { exerciseIndex: nextIdx, setIndex: 0, phase: 'exercise', timeLeft: nextEff.duration ?? null, skipped: newSkipped }
    })
  }, [routine, total])

  // Countdown timer
  useEffect(() => {
    if (state.timeLeft === null || state.timeLeft <= 0) return
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.timeLeft === null || prev.timeLeft <= 0) return prev
        return { ...prev, timeLeft: prev.timeLeft - 1 }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [state.phase, state.exerciseIndex, state.setIndex])

  // Auto-advance when timer hits 0
  useEffect(() => {
    if (state.timeLeft === 0) advance()
  }, [state.timeLeft])

  // Fire onComplete when done
  useEffect(() => {
    if (state.exerciseIndex >= total && total > 0) {
      onComplete(state.skipped)
    }
    // Empty routine
    if (total === 0) onComplete([])
  }, [state.exerciseIndex, total])

  const isDone = state.exerciseIndex >= total

  const currentExercise = isDone ? null : routine.resolvedExercises[state.exerciseIndex]
  const resolvedExercise = isDone ? null : routine.exercises[state.exerciseIndex]

  const totalSets = currentExercise && resolvedExercise
    ? getEffective(resolvedExercise, currentExercise).sets
    : 1

  return {
    currentExercise,
    resolvedExercise,
    phase: state.phase,
    timeLeft: state.timeLeft,
    setIndex: state.setIndex,
    totalSets,
    progress: total === 0 ? 1 : state.exerciseIndex / total,
    skipped: state.skipped,
    isDone,
    advance,
    skip,
    abort: onAbort,
  }
}
