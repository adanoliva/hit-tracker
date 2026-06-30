import type { Exercise, ExerciseCategory } from '../types'

const BASE = 'https://wger.de/api/v2'
const TIMEOUT = 10_000
const LANG_ES = 4   // Spanish (wger language id — NOT 6, which is Dutch)
const LANG_EN = 2

const CATEGORY_MAP: Record<number, ExerciseCategory> = {
  10: 'core',
  12: 'core',
  13: 'upper',
  8: 'upper',
  9: 'lower',
  11: 'fullbody',
}

interface WgerTranslation {
  name: string
  description: string
  language: number
}

interface WgerExerciseInfo {
  id: number
  category: { id: number; name: string }
  equipment: Array<{ id: number; name: string }>
  muscles: Array<{ name_en: string }>
  translations: WgerTranslation[]
}

// Public shape used by UI components
export interface WgerExercise {
  id: number
  name: string
  description: string
  category: { id: number; name: string }
  equipment: Array<{ id: number; name: string }>
  muscles: Array<{ name_en: string }>
}

function pickTranslation(info: WgerExerciseInfo, preferLang: number): WgerTranslation | undefined {
  return (
    info.translations.find((t) => t.language === preferLang) ??
    info.translations.find((t) => t.language === LANG_EN)
  )
}

function flatten(info: WgerExerciseInfo, lang: number): WgerExercise | null {
  const t = pickTranslation(info, lang)
  if (!t) return null
  return { id: info.id, name: t.name, description: t.description, category: info.category, equipment: info.equipment, muscles: info.muscles }
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

// ponytail: fetch 100 via exerciseinfo (has name in translations), filter client-side by query
export async function searchExercises(query: string): Promise<WgerExercise[]> {
  const q = query.toLowerCase().trim()
  for (const lang of [LANG_ES, LANG_EN]) {
    const url = `${BASE}/exerciseinfo/?format=json&language=${lang}&equipment=7&equipment=3&limit=100`
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error(`wger error ${res.status}`)
    const data = await res.json()
    const infos: WgerExerciseInfo[] = data.results ?? []
    const all = infos.map((i) => flatten(i, lang)).filter((e): e is WgerExercise => e !== null)
    const filtered = q ? all.filter((e) => e.name.toLowerCase().includes(q)) : all
    if (filtered.length > 0 || lang === LANG_EN) return filtered
  }
  return []
}

export function mapToExercise(wger: WgerExercise): Exercise {
  return {
    id: `wger-${wger.id}`,
    name: wger.name,
    category: CATEGORY_MAP[wger.category?.id] ?? 'core',
    muscles: (wger.muscles ?? []).map((m) => m.name_en).filter(Boolean),
    equipment: (wger.equipment ?? []).some((e) => e.id === 3) ? 'dumbbells' : 'none',
    description: (wger.description ?? '').replace(/<[^>]*>/g, '').trim(),
    rest: 30,
    difficulty: 'medium',
  }
}
