// Test de caracterización de exerciseService, migrado desde shared/__tests__
// junto con el código a shared-kernel/domain/exercise.ts.
import { exerciseService } from '../domain/exercise'

describe('exerciseService — caracterización previa a migración a shared-kernel', () => {
  it('getAll devuelve el catálogo completo', () => {
    const all = exerciseService.getAll()
    expect(all.length).toBe(48)
    expect(all[0]).toMatchObject({ id: 'gv-1160', name: 'Burpee', category: 'warmup' })
  })

  it('getByCategory filtra solo por la categoría pedida', () => {
    const warmup = exerciseService.getByCategory('warmup')
    const boxing = exerciseService.getByCategory('boxing')
    expect(warmup.length).toBeGreaterThan(0)
    expect(warmup.every((e) => e.category === 'warmup')).toBe(true)
    expect(boxing.every((e) => e.category === 'boxing')).toBe(true)
  })

  it('getById devuelve el ejercicio o undefined si no existe', () => {
    expect(exerciseService.getById('gv-1160')?.name).toBe('Burpee')
    expect(exerciseService.getById('no-existe')).toBeUndefined()
  })

  it('getRoutines resuelve exerciseId a los objetos Exercise completos', () => {
    const routines = exerciseService.getRoutines()
    expect(routines.length).toBe(2)
    const warmupBoxing = routines.find((r) => r.id === 'warmup-boxing')!
    expect(warmupBoxing.resolvedExercises.length).toBe(warmupBoxing.exercises.length)
    expect(warmupBoxing.resolvedExercises[0]).toMatchObject({ id: 'gv-1428' })
  })

  it('getRoutineById resuelve una rutina puntual, o undefined si no existe', () => {
    expect(exerciseService.getRoutineById('warmup-boxing')?.name).toBe('Calentamiento Boxeo')
    expect(exerciseService.getRoutineById('no-existe')).toBeUndefined()
  })

  it('getRoutines descarta silenciosamente exerciseId que no resuelven a un ejercicio', () => {
    // comportamiento actual documentado, no necesariamente deseado: si el catálogo
    // cambia y una rutina referencia un id borrado, resolvedExercises queda más corto
    // que exercises sin lanzar error.
    const routines = exerciseService.getRoutines()
    for (const r of routines) {
      expect(r.resolvedExercises.length).toBeLessThanOrEqual(r.exercises.length)
    }
  })
})
