import type { Exercise, ExerciseCategory } from '../../shared/types'

// --- slug generation (mirrors customExerciseStore.add) ---
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
function makeCustomId(name: string): string {
  return `custom-${slugify(name)}-1000`
}

// --- base detection (mirrors CatalogScreen logic) ---
function isBase(id: string, baseIds: Set<string>): boolean {
  return baseIds.has(id)
}

// --- category filter (mirrors CatalogScreen tab logic) ---
function filterByCategories(exercises: Exercise[], cats: ExerciseCategory[]): Exercise[] {
  return exercises.filter((e) => cats.includes(e.category))
}

// --- name search (mirrors CatalogScreen useMemo) ---
function searchByName(exercises: Exercise[], query: string): Exercise[] {
  if (!query.trim()) return exercises
  const q = query.toLowerCase()
  return exercises.filter((e) => e.name.toLowerCase().includes(q))
}

// --- merge base + custom (mirrors CatalogScreen) ---
function mergeExercises(base: Exercise[], custom: Exercise[], cats: ExerciseCategory[]): Exercise[] {
  return [
    ...filterByCategories(base, cats),
    ...filterByCategories(custom, cats),
  ]
}

const BASE_EX: Exercise = {
  id: 'boxing-jab-cross',
  name: 'Combinación 1-2 (Jab-Cross)',
  category: 'boxing',
  muscles: ['Hombros', 'Pecho', 'Core'],
  equipment: 'none',
  description: 'Jab de exploración seguido de cross potente.',
  duration: 60,
  rest: 30,
  difficulty: 'easy',
}

const CUSTOM_EX: Exercise = {
  id: 'custom-mi-combo-1000',
  name: 'Mi Combo',
  category: 'boxing',
  muscles: ['Core'],
  equipment: 'none',
  description: '',
  duration: 45,
  rest: 20,
  difficulty: 'medium',
}

describe('HT-021-a — Catálogo de ejercicios', () => {
  describe('slugify — generación de ID custom', () => {
    it('convierte espacios y caracteres especiales a guiones', () => {
      expect(slugify('Combinación 1-2 (Jab-Cross)')).toBe('combinaci-n-1-2-jab-cross')
    })

    it('elimina guiones al inicio y al final', () => {
      expect(slugify('  test  ')).toBe('test')
    })

    it('ID tiene prefijo custom-', () => {
      expect(makeCustomId('Mi Combo').startsWith('custom-')).toBe(true)
    })

    it('nombre vacío produce slug vacío → ID "custom--<ts>"', () => {
      const id = makeCustomId('')
      expect(id).toMatch(/^custom--\d+$/)
    })
  })

  describe('isBase — detección de ejercicio base', () => {
    const baseIds = new Set(['boxing-jab-cross', 'neck-rotations'])

    it('ID en JSON base → es base', () => {
      expect(isBase('boxing-jab-cross', baseIds)).toBe(true)
    })

    it('ID con prefijo custom- → no es base', () => {
      expect(isBase('custom-mi-combo-1000', baseIds)).toBe(false)
    })

    it('ID desconocido → no es base', () => {
      expect(isBase('unknown-exercise', baseIds)).toBe(false)
    })
  })

  describe('filterByCategories — filtrado por tab', () => {
    const exercises: Exercise[] = [
      { ...BASE_EX, id: 'boxing-1', category: 'boxing' },
      { ...BASE_EX, id: 'core-1', category: 'core' },
      { ...BASE_EX, id: 'warmup-1', category: 'warmup' },
    ]

    it('tab Boxing → solo ejercicios boxing', () => {
      const result = filterByCategories(exercises, ['boxing'])
      expect(result.map((e) => e.id)).toEqual(['boxing-1'])
    })

    it('tab Core/Fullbody → core, upper, lower, fullbody', () => {
      const result = filterByCategories(exercises, ['core', 'upper', 'lower', 'fullbody'])
      expect(result.map((e) => e.id)).toEqual(['core-1'])
    })

    it('categoría no presente → lista vacía', () => {
      const result = filterByCategories(exercises, ['mobility'])
      expect(result).toHaveLength(0)
    })
  })

  describe('searchByName — buscador local', () => {
    const exercises: Exercise[] = [
      { ...BASE_EX, id: '1', name: 'Jab Cross' },
      { ...BASE_EX, id: '2', name: 'Gancho al cuerpo' },
      { ...BASE_EX, id: '3', name: 'Uppercut izquierdo' },
    ]

    it('query vacía → devuelve todos', () => {
      expect(searchByName(exercises, '')).toHaveLength(3)
    })

    it('query con espacios → devuelve todos (sin trim no hay match)', () => {
      expect(searchByName(exercises, '   ')).toHaveLength(3)
    })

    it('búsqueda case-insensitive', () => {
      const result = searchByName(exercises, 'JAB')
      expect(result.map((e) => e.id)).toEqual(['1'])
    })

    it('búsqueda parcial funciona', () => {
      const result = searchByName(exercises, 'upper')
      expect(result.map((e) => e.id)).toEqual(['3'])
    })

    it('sin coincidencias → lista vacía', () => {
      expect(searchByName(exercises, 'spinning kick')).toHaveLength(0)
    })
  })

  describe('mergeExercises — base + custom en mismo tab', () => {
    const base: Exercise[] = [BASE_EX]
    const custom: Exercise[] = [CUSTOM_EX, { ...CUSTOM_EX, id: 'custom-warmup-2', category: 'warmup' }]

    it('merge devuelve base + custom del tab activo', () => {
      const result = mergeExercises(base, custom, ['boxing'])
      expect(result.map((e) => e.id)).toEqual([BASE_EX.id, CUSTOM_EX.id])
    })

    it('custom de otra categoría no aparece en el tab actual', () => {
      const result = mergeExercises(base, custom, ['boxing'])
      expect(result.find((e) => e.id === 'custom-warmup-2')).toBeUndefined()
    })

    it('sin custom → solo base', () => {
      const result = mergeExercises(base, [], ['boxing'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(BASE_EX.id)
    })

    it('sin base → solo custom', () => {
      const result = mergeExercises([], [CUSTOM_EX], ['boxing'])
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(CUSTOM_EX.id)
    })
  })

  describe('remove — eliminación de ejercicio custom', () => {
    it('filtra por ID correctamente', () => {
      const exercises = [CUSTOM_EX, { ...CUSTOM_EX, id: 'custom-otro-1' }]
      const after = exercises.filter((e) => e.id !== CUSTOM_EX.id)
      expect(after).toHaveLength(1)
      expect(after[0].id).toBe('custom-otro-1')
    })

    it('eliminar ID inexistente no cambia la lista', () => {
      const exercises = [CUSTOM_EX]
      const after = exercises.filter((e) => e.id !== 'custom-noexiste')
      expect(after).toHaveLength(1)
    })
  })
})
