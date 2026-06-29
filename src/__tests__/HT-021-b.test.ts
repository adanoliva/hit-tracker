import { mapToExercise, type WgerExercise } from '../core/services/wgerService'

const makeWger = (overrides: Partial<WgerExercise> = {}): WgerExercise => ({
  id: 42,
  name: 'Crunch',
  description: '<p>Core exercise</p>',
  category: { id: 10, name: 'Abs' },
  equipment: [{ id: 7, name: 'Body weight' }],
  muscles: [{ name_en: 'Rectus abdominis' }, { name_en: 'Obliques' }],
  ...overrides,
})

describe('HT-021-b — wgerService', () => {
  describe('mapToExercise', () => {
    it('should set id as wger-{id}', () => {
      expect(mapToExercise(makeWger()).id).toBe('wger-42')
    })

    it('should strip HTML from description', () => {
      const ex = mapToExercise(makeWger({ description: '<p>Do <b>this</b> exercise.</p>' }))
      expect(ex.description).toBe('Do this exercise.')
    })

    it('should default rest to 30 and difficulty to medium', () => {
      const ex = mapToExercise(makeWger())
      expect(ex.rest).toBe(30)
      expect(ex.difficulty).toBe('medium')
    })

    it('should map category Abs (10) → core', () => {
      expect(mapToExercise(makeWger({ category: { id: 10, name: 'Abs' } })).category).toBe('core')
    })

    it('should map category Back (12) → core', () => {
      expect(mapToExercise(makeWger({ category: { id: 12, name: 'Back' } })).category).toBe('core')
    })

    it('should map category Shoulders (13) → upper', () => {
      expect(mapToExercise(makeWger({ category: { id: 13, name: 'Shoulders' } })).category).toBe('upper')
    })

    it('should map category Arms (8) → upper', () => {
      expect(mapToExercise(makeWger({ category: { id: 8, name: 'Arms' } })).category).toBe('upper')
    })

    it('should map category Legs (9) → lower', () => {
      expect(mapToExercise(makeWger({ category: { id: 9, name: 'Legs' } })).category).toBe('lower')
    })

    it('should map category Chest (11) → fullbody', () => {
      expect(mapToExercise(makeWger({ category: { id: 11, name: 'Chest' } })).category).toBe('fullbody')
    })

    it('should default unknown category → core', () => {
      expect(mapToExercise(makeWger({ category: { id: 99, name: 'Unknown' } })).category).toBe('core')
    })

    it('should set equipment dumbbells when dumbbell (id=3) present', () => {
      const ex = mapToExercise(makeWger({ equipment: [{ id: 3, name: 'Dumbbell' }] }))
      expect(ex.equipment).toBe('dumbbells')
    })

    it('should set equipment none when only body weight (id=7)', () => {
      const ex = mapToExercise(makeWger({ equipment: [{ id: 7, name: 'Body weight' }] }))
      expect(ex.equipment).toBe('none')
    })

    it('should extract muscle names', () => {
      const ex = mapToExercise(makeWger())
      expect(ex.muscles).toEqual(['Rectus abdominis', 'Obliques'])
    })

    it('should handle empty muscles array', () => {
      const ex = mapToExercise(makeWger({ muscles: [] }))
      expect(ex.muscles).toEqual([])
    })

    it('should handle empty description', () => {
      const ex = mapToExercise(makeWger({ description: '' }))
      expect(ex.description).toBe('')
    })

    it('should handle null-ish description gracefully', () => {
      // ponytail: tests that the ?? '' guard works
      const ex = mapToExercise(makeWger({ description: undefined as unknown as string }))
      expect(ex.description).toBe('')
    })
  })
})
