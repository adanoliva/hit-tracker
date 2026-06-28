import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { Check } from 'lucide-react-native'
import type { Exercise, ExerciseCategory } from '../../core/types'
import { exerciseService } from '../../core/services/exerciseService'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { colors } from '../../theme'

interface ExerciseSelectorProps {
  category: ExerciseCategory | ExerciseCategory[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function ExerciseSelector({ category, selected, onChange }: ExerciseSelectorProps) {
  const customExercises = useCustomExerciseStore((s) => s.exercises)
  const cats = Array.isArray(category) ? category : [category]
  const base = cats.flatMap((c) => exerciseService.getByCategory(c))
  const custom = customExercises.filter((e) => cats.includes(e.category))
  const all = [...base, ...custom]

  // Selected first, then unselected
  const sorted = [
    ...all.filter((e) => selected.includes(e.id)),
    ...all.filter((e) => !selected.includes(e.id)),
  ]

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  if (sorted.length === 0) {
    return <Text style={s.empty}>No hay ejercicios disponibles</Text>
  }

  return (
    <View style={s.list}>
      {sorted.map((ex) => {
        const isSelected = selected.includes(ex.id)
        return (
          <TouchableOpacity key={ex.id} style={s.row} onPress={() => toggle(ex.id)}>
            <View style={s.info}>
              <Text style={s.name}>{ex.name}</Text>
              <Text style={s.meta}>
                {ex.duration ? `${ex.duration}s` : ex.reps ? `${ex.reps} reps` : ''}
                {ex.muscles.length > 0 ? `  ·  ${ex.muscles.slice(0, 2).join(', ')}` : ''}
              </Text>
            </View>
            <View style={[s.checkbox, isSelected && s.checkboxActive]}>
              {isSelected && <Check size={12} color="#fff" />}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  list: { gap: 6 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 12, gap: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  meta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', padding: 16 },
})
