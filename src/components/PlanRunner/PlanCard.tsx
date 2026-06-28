import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Flame, Dumbbell, Target, Play, Pencil, Trash2 } from 'lucide-react-native'
import type { WorkoutPlan } from '../../core/types'
import { exerciseService } from '../../core/services/exerciseService'
import { colors } from '../../theme'

function estimateMins(plan: WorkoutPlan): number {
  const warmupSecs = plan.warmupExerciseIds.reduce((sum, id) => {
    const ex = exerciseService.getById(id)
    return sum + (ex?.duration ?? 30) + (ex?.rest ?? 15)
  }, 0)
  const coreSecs = plan.coreExerciseIds.reduce((sum, id) => {
    const ex = exerciseService.getById(id)
    return sum + (ex?.duration ?? 30) + (ex?.rest ?? 15)
  }, 0)
  const b = plan.boxing
  const boxingSecs = b.roundDuration === 0
    ? b.numRounds * 120  // estimate 2min per free round
    : b.numRounds * b.roundDuration + (b.numRounds - 1) * b.restDuration
  return Math.ceil((warmupSecs + coreSecs + boxingSecs) / 60)
}

interface PlanCardProps {
  plan: WorkoutPlan
  onRun: () => void
  onEdit: () => void
  onDelete: () => void
}

export function PlanCard({ plan, onRun, onEdit, onDelete }: PlanCardProps) {
  const mins = estimateMins(plan)
  const b = plan.boxing

  const handleDelete = () =>
    Alert.alert('Eliminar plan', `¿Eliminar "${plan.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ])

  return (
    <View style={s.card}>
      <View style={s.top}>
        <Text style={s.name} numberOfLines={1}>{plan.name}</Text>
        <View style={s.phases}>
          {plan.warmupExerciseIds.length > 0 && <Flame size={14} color={colors.accent} />}
          {plan.coreExerciseIds.length > 0 && <Dumbbell size={14} color={colors.secondary} />}
          <Target size={14} color={colors.textMuted} />
        </View>
      </View>
      <Text style={s.meta}>
        {b.roundDuration === 0 ? `${b.numRounds} ronda${b.numRounds > 1 ? 's' : ''} libres` : `${b.numRounds}×${b.roundDuration / 60}min`}
        {'  ·  '}≈{mins} min
      </Text>
      <View style={s.actions}>
        <TouchableOpacity style={s.runBtn} onPress={onRun}>
          <Play size={14} color="#fff" />
          <Text style={s.runText}>Ejecutar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={onEdit}>
          <Pencil size={16} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={handleDelete}>
          <Trash2 size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  phases: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  meta: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14, flex: 1, justifyContent: 'center',
  },
  runText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  iconBtn: {
    backgroundColor: colors.bgTertiary, borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: colors.border,
  },
})
