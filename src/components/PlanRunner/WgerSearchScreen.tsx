import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, ScrollView, type ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Search, Check, Plus, X } from 'lucide-react-native'
import { searchExercises, mapToExercise, type WgerExercise } from '../../core/services/wgerService'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { colors } from '../../theme'

const PAGE_SIZE = 20

interface Props {
  onBack: () => void
}

const EQUIP_LABEL: Record<number, string> = { 7: 'Sin material', 3: 'Mancuernas' }

// Maps wger category id → label shown in the catalog tab
const CATEGORY_LABEL: Record<number, string> = {
  10: 'Core / Fullbody',
  12: 'Core / Fullbody',
  13: 'Core / Fullbody',
  8: 'Core / Fullbody',
  9: 'Core / Fullbody',
  11: 'Core / Fullbody',
}

export function WgerSearchScreen({ onBack }: Props) {
  const { top } = useSafeAreaInsets()
  const exercises = useCustomExerciseStore((s) => s.exercises)
  const addExercise = useCustomExerciseStore((s) => s.addExercise)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WgerExercise[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [detail, setDetail] = useState<WgerExercise | null>(null)
  const lastSearchAt = useRef(0)

  const importedIds = new Set(exercises.map((e) => e.id))

  async function handleSearch() {
    const now = Date.now()
    if (now - lastSearchAt.current < 2_000) return
    lastSearchAt.current = now
    setLoading(true)
    setError(null)
    setPage(1)
    try {
      const data = await searchExercises(query)
      setResults(data)
      setSearched(true)
    } catch {
      setError('Sin conexión, inténtalo más tarde')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function handleAdd(item: WgerExercise) {
    addExercise(mapToExercise(item))
  }

  const visible = results.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < results.length

  return (
    <View style={[s.container, { paddingTop: top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Buscar en wger</Text>
      </View>

      <View style={s.searchRow}>
        <View style={s.inputWrap}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Nombre del ejercicio..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
        </View>
        <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={loading}>
          <Text style={s.searchBtnText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={s.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={s.loader} color={colors.accent} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(e) => String(e.id)}
          contentContainerStyle={s.list}
          ListEmptyComponent={searched ? <Text style={s.empty}>Sin resultados</Text> : null}
          ListFooterComponent={
            hasMore ? (
              <TouchableOpacity style={s.moreBtn} onPress={() => setPage((p) => p + 1)}>
                <Text style={s.moreBtnText}>Ver más</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => {
            const id = `wger-${item.id}`
            const added = importedIds.has(id)
            const muscles = (item.muscles ?? []).map((m) => m.name_en).filter(Boolean).slice(0, 2).join(', ')
            const destTab = CATEGORY_LABEL[item.category?.id] ?? 'Core / Fullbody'
            return (
              <TouchableOpacity style={s.row} onPress={() => setDetail(item)} activeOpacity={0.7}>
                <View style={s.info}>
                  <Text style={s.name}>{item.name}</Text>
                  {muscles ? <Text style={s.meta}>{muscles}</Text> : null}
                  <Text style={s.dest}>→ {destTab}</Text>
                </View>
                <TouchableOpacity
                  style={[s.addBtn, added && s.addBtnDone]}
                  onPress={() => { if (!added) handleAdd(item) }}
                  disabled={added}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {added
                    ? <Check size={16} color={colors.textMuted} />
                    : <Plus size={16} color={colors.accent} />
                  }
                  <Text style={[s.addBtnText, added && s.addBtnTextDone]}>
                    {added ? 'Añadido' : 'Añadir'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )
          }}
        />
      )}

      {detail && (
        <WgerDetailSheet
          item={detail}
          added={importedIds.has(`wger-${detail.id}`)}
          onAdd={() => handleAdd(detail)}
          onClose={() => setDetail(null)}
        />
      )}
    </View>
  )
}

function WgerDetailSheet({ item, added, onAdd, onClose }: {
  item: WgerExercise
  added: boolean
  onAdd: () => void
  onClose: () => void
}) {
  const { bottom } = useSafeAreaInsets()
  const muscles = (item.muscles ?? []).map((m) => m.name_en).filter(Boolean).join(' · ')
  const equip = (item.equipment ?? []).map((e) => EQUIP_LABEL[e.id] ?? e.name).join(', ')
  const desc = (item.description ?? '').replace(/<[^>]*>/g, '').trim()
  const destTab = CATEGORY_LABEL[item.category?.id] ?? 'Core / Fullbody'

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={d.overlay}>
        <View style={[d.sheet, { paddingBottom: Math.max(bottom, 24) } as ViewStyle]}>
          <View style={d.header}>
            <Text style={d.title} numberOfLines={3}>{item.name}</Text>
            <TouchableOpacity onPress={onClose} style={d.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={d.body} showsVerticalScrollIndicator={false}>
            {muscles ? (
              <View style={d.row}>
                <Text style={d.label}>Músculos</Text>
                <Text style={d.value}>{muscles}</Text>
              </View>
            ) : null}
            {equip ? (
              <View style={d.row}>
                <Text style={d.label}>Equipamiento</Text>
                <Text style={d.value}>{equip}</Text>
              </View>
            ) : null}
            <View style={d.row}>
              <Text style={d.label}>Se guardará en</Text>
              <Text style={d.value}>{destTab}</Text>
            </View>
            {desc ? (
              <View style={d.row}>
                <Text style={d.label}>Descripción</Text>
                <Text style={d.desc}>{desc}</Text>
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[d.addBtn, added && d.addBtnDone]}
            onPress={() => { if (!added) { onAdd(); onClose() } }}
            disabled={added}
          >
            {added
              ? <Check size={18} color={colors.textMuted} />
              : <Plus size={18} color="#fff" />
            }
            <Text style={[d.addBtnText, added && d.addBtnTextDone]}>
              {added ? 'Ya añadido al catálogo' : 'Añadir al catálogo'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  searchRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  input: { flex: 1, fontSize: 14, color: colors.textPrimary },
  searchBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loader: { marginTop: 40 },
  error: { color: colors.accent, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 32 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 12,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 11, color: colors.textMuted },
  dest: { fontSize: 11, color: colors.accent, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.accent, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  addBtnDone: { borderColor: colors.border },
  addBtnText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  addBtnTextDone: { color: colors.textMuted },
  moreBtn: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, alignItems: 'center', marginTop: 8,
  },
  moreBtnText: { color: colors.textSecondary, fontWeight: '600' },
})

const d = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 20, paddingBottom: 8, gap: 12,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20, marginBottom: 12 },
  row: { marginBottom: 14 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, color: colors.textPrimary },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, backgroundColor: colors.accent,
    borderRadius: 12, padding: 14,
  },
  addBtnDone: { backgroundColor: colors.bgTertiary },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addBtnTextDone: { color: colors.textMuted },
})
