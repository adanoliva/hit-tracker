import { useState } from 'react'
import {
  Modal, View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity,
} from 'react-native'
import { X } from 'lucide-react-native'
import type { Exercise, ExerciseCategory } from '../../core/types'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { colors } from '../../theme'

interface Props {
  category: ExerciseCategory
  onClose: () => void
}

const MUSCLE_OPTIONS = [
  'Hombros', 'Pecho', 'Bíceps', 'Tríceps', 'Core', 'Oblicuos',
  'Piernas', 'Pantorrillas', 'Cuello', 'Espalda',
]
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const
const DIFF_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' }

const CAT_TITLE: Partial<Record<ExerciseCategory, string>> = {
  boxing: 'Nuevo ejercicio de boxing',
  warmup: 'Nuevo ejercicio de calentamiento',
  core: 'Nuevo ejercicio de core',
  fullbody: 'Nuevo ejercicio fullbody',
  upper: 'Nuevo ejercicio de tren superior',
  lower: 'Nuevo ejercicio de tren inferior',
  mobility: 'Nuevo ejercicio de movilidad',
}

const isBoxing = (cat: ExerciseCategory) => cat === 'boxing'

export function BoxingExerciseForm({ category, onClose }: Props) {
  const add = useCustomExerciseStore((s) => s.add)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('60')
  const [rest, setRest] = useState('30')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [muscles, setMuscles] = useState<string[]>([])
  const [error, setError] = useState('')

  const toggleMuscle = (m: string) =>
    setMuscles((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m])

  const save = () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    const ex: Omit<Exercise, 'id'> = {
      name: name.trim(),
      category,
      muscles,
      equipment: 'none',
      description: description.trim(),
      difficulty,
      rest: isBoxing(category) ? 0 : (parseInt(rest) || 30),
      ...(isBoxing(category) ? {} : { duration: parseInt(duration) || 60 }),
    }
    add(ex)
    onClose()
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{CAT_TITLE[category] ?? 'Nuevo ejercicio'}</Text>
            <TouchableOpacity onPress={onClose}><X size={20} color={colors.textMuted} /></TouchableOpacity>
          </View>

          <ScrollView style={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Nombre *</Text>
            <TextInput
              style={[s.input, !!error && s.inputError]}
              value={name}
              onChangeText={(v) => { setName(v); setError('') }}
              placeholder={isBoxing(category) ? 'Ej: Combinación 1-2-3-2' : 'Ej: Plancha con rotación'}
              placeholderTextColor={colors.textMuted}
              maxLength={80}
            />
            {!!error && <Text style={s.errorText}>{error}</Text>}

            <Text style={s.label}>Descripción / instrucciones</Text>
            <TextInput
              style={[s.input, s.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Instrucciones, notas técnicas..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              maxLength={300}
            />

            {!isBoxing(category) && (
              <View style={s.row}>
                <View style={s.half}>
                  <Text style={s.label}>Duración (s)</Text>
                  <TextInput
                    style={s.input}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
                <View style={s.half}>
                  <Text style={s.label}>Descanso (s)</Text>
                  <TextInput
                    style={s.input}
                    value={rest}
                    onChangeText={setRest}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            )}

            <Text style={s.label}>Dificultad</Text>
            <View style={s.segmented}>
              {DIFFICULTIES.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.segBtn, difficulty === d && s.segBtnActive]}
                  onPress={() => setDifficulty(d)}
                >
                  <Text style={[s.segBtnText, difficulty === d && s.segBtnTextActive]}>
                    {DIFF_LABEL[d]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Músculos</Text>
            <View style={s.chips}>
              {MUSCLE_OPTIONS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.chip, muscles.includes(m) && s.chipActive]}
                  onPress={() => toggleMuscle(m)}
                >
                  <Text style={[s.chipText, muscles.includes(m) && s.chipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>Guardar ejercicio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '92%', paddingBottom: 24,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, paddingBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  body: { paddingHorizontal: 20 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: colors.bgTertiary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.textPrimary,
  },
  inputError: { borderColor: colors.accent },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  errorText: { color: colors.accent, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  segmented: { flexDirection: 'row', gap: 8 },
  segBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgTertiary, alignItems: 'center',
  },
  segBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  segBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  segBtnTextActive: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: colors.accent, borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
