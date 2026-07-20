import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import type { Exercise } from '../../core/types'
import { EXERCISE_IMAGES } from '../../generated/exerciseImages'
import { colors } from '../../theme'

interface Props {
  exercise: Exercise | null
  isBase: boolean
  onClose: () => void
  onDelete?: (id: string) => void
}

const DIFF_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' }
const DIFF_COLOR: Record<string, string> = { easy: '#4caf50', medium: '#ff9800', hard: colors.accent }

export function ExerciseDetailSheet({ exercise, isBase, onClose, onDelete }: Props) {
  const { bottom } = useSafeAreaInsets()
  if (!exercise) return null

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(bottom, 24) }]}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={2}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {EXERCISE_IMAGES[exercise.id] && (
            <Image source={EXERCISE_IMAGES[exercise.id]} style={s.image} resizeMode="contain" />
          )}

          <View style={s.badges}>
            <View style={[s.badge, { borderColor: DIFF_COLOR[exercise.difficulty] }]}>
              <Text style={[s.badgeText, { color: DIFF_COLOR[exercise.difficulty] }]}>
                {DIFF_LABEL[exercise.difficulty]}
              </Text>
            </View>
            {isBase && (
              <View style={[s.badge, { borderColor: colors.textMuted }]}>
                <Text style={[s.badgeText, { color: colors.textMuted }]}>Base</Text>
              </View>
            )}
            <View style={[s.badge, { borderColor: colors.border }]}>
              <Text style={[s.badgeText, { color: colors.textSecondary }]}>
                {exercise.duration ? `${exercise.duration}s` : `${exercise.reps} reps`}
              </Text>
            </View>
          </View>

          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            {exercise.muscles.length > 0 && (
              <View style={s.row}>
                <Text style={s.label}>Músculos</Text>
                <Text style={s.value}>{exercise.muscles.join(' · ')}</Text>
              </View>
            )}
            {exercise.equipment !== 'none' && (
              <View style={s.row}>
                <Text style={s.label}>Equipo</Text>
                <Text style={s.value}>{exercise.equipment}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.label}>Descanso</Text>
              <Text style={s.value}>{exercise.rest}s</Text>
            </View>
            {!!exercise.description && (
              <View style={s.descBlock}>
                <Text style={s.label}>Descripción</Text>
                <Text style={s.desc}>{exercise.description}</Text>
              </View>
            )}
          </ScrollView>

          {!isBase && onDelete && (
            <TouchableOpacity style={s.deleteBtn} onPress={() => { onDelete(exercise.id); onClose() }}>
              <Text style={s.deleteBtnText}>Eliminar ejercicio</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
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
  image: { width: '100%', height: 200, backgroundColor: colors.bgTertiary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  badge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  body: { paddingHorizontal: 20 },
  row: { marginBottom: 12 },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 14, color: colors.textPrimary },
  descBlock: { marginBottom: 16 },
  desc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  deleteBtn: {
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: '#3a1010', borderRadius: 10,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.accent,
  },
  deleteBtnText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
})
