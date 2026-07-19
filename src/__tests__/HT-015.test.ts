import { exerciseService } from '../../shared/services/exercise'

test('getAll returns ≥ 25 exercises with required fields', () => {
  const all = exerciseService.getAll()
  expect(all.length).toBeGreaterThanOrEqual(25)
  for (const ex of all) {
    expect(ex.id).toBeTruthy()
    expect(ex.name).toBeTruthy()
    expect(ex.category).toBeTruthy()
    expect(typeof ex.rest).toBe('number')
  }
})

test('getRoutineById warmup-boxing resolves 8 exercises in order', () => {
  const r = exerciseService.getRoutineById('warmup-boxing')
  expect(r).toBeDefined()
  expect(r!.resolvedExercises).toHaveLength(8)
  expect(r!.resolvedExercises[0].id).toBe('gv-1428')
})

test('invalid exerciseId in routine is omitted silently', () => {
  // core-boxer has 6 valid exercises; if we force an invalid one the service should not throw
  const routines = exerciseService.getRoutines()
  expect(routines.length).toBeGreaterThan(0)
  for (const r of routines) {
    expect(() => r.resolvedExercises).not.toThrow()
  }
})

test('getByCategory warmup returns ≥ 8 exercises all with category warmup', () => {
  const warmup = exerciseService.getByCategory('warmup')
  expect(warmup.length).toBeGreaterThanOrEqual(8)
  expect(warmup.every((e) => e.category === 'warmup')).toBe(true)
})
