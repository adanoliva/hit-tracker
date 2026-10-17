import type { Exercise, ExerciseCategory, Routine, RoutineExercise } from '@shared/types'
import exercisesData from '../data/exercises.json'
import routinesData from '../data/routines.json'

export type ResolvedRoutine = Routine & { resolvedExercises: Exercise[] }

class ExerciseService {
  private exercises: Exercise[] = exercisesData as Exercise[]
  private routines: Routine[] = routinesData as Routine[]

  getAll(): Exercise[] {
    return this.exercises
  }

  getByCategory(cat: ExerciseCategory): Exercise[] {
    return this.exercises.filter((e) => e.category === cat)
  }

  getById(id: string): Exercise | undefined {
    return this.exercises.find((e) => e.id === id)
  }

  getRoutines(): ResolvedRoutine[] {
    return this.routines.map((r) => this.resolve(r))
  }

  getRoutineById(id: string): ResolvedRoutine | undefined {
    const r = this.routines.find((r) => r.id === id)
    return r ? this.resolve(r) : undefined
  }

  private resolve(routine: Routine): ResolvedRoutine {
    const resolvedExercises = routine.exercises
      .map((re: RoutineExercise) => this.getById(re.exerciseId))
      .filter((e): e is Exercise => e !== undefined)
    return { ...routine, resolvedExercises }
  }
}

export const exerciseService = new ExerciseService()
