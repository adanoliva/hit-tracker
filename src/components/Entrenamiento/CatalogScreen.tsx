import { useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Search, Plus, ExternalLink } from 'lucide-react-native'
import type { Exercise, ExerciseCategory } from '../../core/types'
import { exerciseService } from '../../core/services/exerciseService'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { ExerciseDetailSheet } from './ExerciseDetailSheet'
import { BoxingExerciseForm } from './BoxingExerciseForm'
import { colors } from '../../theme'

interface Props {
  onBack: () => void
  onWgerSearch?: () => void
}

type Tab = 'warmup' | 'core' | 'boxing'

const TABS: { key: Tab; label: string; cats: ExerciseCategory[] }[] = [
  { key: 'warmup', label: 'Calentamiento', cats: ['warmup', 'mobility'] },
  { key: 'core', label: 'Core / Fullbody', cats: ['core', 'upper', 'lower', 'fullbody'] },
  { key: 'boxing', label: 'Boxing', cats: ['boxing'] },
]

const DIFF_DOT: Record<string, string> = { easy: '#4caf50', medium: '#ff9800', hard: colors.accent }

export function CatalogScreen({ onBack, onWgerSearch }: Props) {
  const { top } = useSafeAreaInsets()
  const customs = useCustomExerciseStore((s) => s.exercises)
  const removeCustom = useCustomExerciseStore((s) => s.remove)
  const baseIds = useMemo(() => new Set(exerciseService.getAll().map((e) => e.id)), [])

  const [tab, setTab] = useState<Tab>('warmup')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Exercise | null>(null)
  const [addCategory, setAddCategory] = useState<ExerciseCategory | null>(null)

  const currentTab = TABS.find((t) => t.key === tab)!

  const exercises = useMemo(() => {
    const base = currentTab.cats.flatMap((c) => exerciseService.getByCategory(c))
    const custom = customs.filter((e) => currentTab.cats.includes(e.category))
    const all = [...base, ...custom]
    if (!query.trim()) return all
    const q = query.toLowerCase()
    return all.filter((e) => e.name.toLowerCase().includes(q))
  }, [tab, customs, query])

  return (
    <View style={[s.container, { paddingTop: top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Catálogo</Text>
      </View>

      <View style={s.searchBar}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar ejercicio..."
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={s.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => { setTab(t.key); setQuery('') }}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={exercises}
        keyExtractor={(e) => e.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={<Text style={s.empty}>Sin resultados</Text>}
        ListFooterComponent={
          <View style={s.footer}>
            {tab !== 'boxing' && onWgerSearch && (
              <TouchableOpacity style={s.actionBtn} onPress={onWgerSearch}>
                <ExternalLink size={16} color={colors.accent} />
                <Text style={s.actionBtnText}>Buscar en wger</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.actionBtn} onPress={() => setAddCategory(currentTab.cats[0])}>
              <Plus size={16} color={colors.accent} />
              <Text style={s.actionBtnText}>Añadir ejercicio</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isBase = baseIds.has(item.id)
          return (
            <TouchableOpacity style={s.row} onPress={() => setSelected(item)}>
              <View style={[s.dot, { backgroundColor: DIFF_DOT[item.difficulty] }]} />
              <View style={s.info}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta}>
                  {item.muscles.slice(0, 2).join(', ')}
                  {item.duration ? `  ·  ${item.duration}s` : item.reps ? `  ·  ${item.reps} reps` : ''}
                </Text>
              </View>
              {isBase && <Text style={s.baseTag}>Base</Text>}
            </TouchableOpacity>
          )
        }}
      />

      <ExerciseDetailSheet
        exercise={selected}
        isBase={selected ? baseIds.has(selected.id) : false}
        onClose={() => setSelected(null)}
        onDelete={(id) => { removeCustom(id); setSelected(null) }}
      />

      {addCategory && <BoxingExerciseForm category={addCategory} onClose={() => setAddCategory(null)} />}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSecondary, alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  baseTag: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  footer: { gap: 10, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.accent, borderRadius: 10,
    padding: 12, justifyContent: 'center',
  },
  actionBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
})
