import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Flame, Dumbbell, Zap, SkipForward, X } from 'lucide-react-native'
import type { Exercise, Routine } from '@shared/types'
import type { ResolvedRoutine } from '../../core/hooks/useWorkoutPlayer'
import { useWorkoutPlayer } from '../../core/hooks/useWorkoutPlayer'
import { EXERCISE_IMAGES } from '../../generated/exerciseImages'
import { colors } from '../../theme'

interface WorkoutPlayerProps {
  routine: ResolvedRoutine
  onComplete: (skipped: string[]) => void
  onAbort: () => void
}

const CategoryIcon = ({ category, size = 32 }: { category: Exercise['category']; size?: number }) => {
  const props = { size, color: colors.accent }
  if (category === 'warmup') return <Flame {...props} />
  if (category === 'core') return <Dumbbell {...props} />
  return <Zap {...props} />
}

export function WorkoutPlayer({ routine, onComplete, onAbort }: WorkoutPlayerProps) {
  const { top, bottom } = useSafeAreaInsets()
  const { currentExercise, phase, timeLeft, setIndex, totalSets, progress, advance, skip, abort } =
    useWorkoutPlayer(routine, onComplete, onAbort)

  if (!currentExercise) return null

  const isReps = timeLeft === null
  const progressPct = `${Math.round(progress * 100)}%` as `${number}%`

  return (
    <View style={[s.container, { paddingTop: top + 16, paddingBottom: bottom + 16 }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.routineName}>{routine.name}</Text>
        <TouchableOpacity onPress={abort} hitSlop={12}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: progressPct }]} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Imagen (o icono si no hay) + phase label */}
        <View style={s.iconWrap}>
          {phase === 'exercise' && EXERCISE_IMAGES[currentExercise.id] ? (
            <Image source={EXERCISE_IMAGES[currentExercise.id]} style={s.exerciseImage} resizeMode="contain" />
          ) : (
            <CategoryIcon category={currentExercise.category} size={48} />
          )}
          <Text style={s.phaseLabel}>
            {phase === 'rest' ? 'Descanso' : totalSets > 1 ? `Serie ${setIndex + 1} / ${totalSets}` : currentExercise.name}
          </Text>
        </View>

        {/* Exercise name (only during exercise phase) */}
        {phase === 'exercise' && totalSets > 1 && (
          <Text style={s.exerciseName}>{currentExercise.name}</Text>
        )}

        {/* Timer or reps */}
        {phase === 'exercise' && !isReps && (
          <Text style={s.timer}>{timeLeft}</Text>
        )}
        {phase === 'exercise' && isReps && (
          <>
            <Text style={s.repsCount}>{currentExercise.reps} reps</Text>
            <TouchableOpacity style={s.doneBtn} onPress={advance}>
              <Text style={s.doneBtnText}>Hecho</Text>
            </TouchableOpacity>
          </>
        )}
        {phase === 'rest' && (
          <Text style={s.timer}>{timeLeft}</Text>
        )}

        {/* Description (exercise phase only) */}
        {phase === 'exercise' && (
          <Text style={s.description}>{currentExercise.description}</Text>
        )}

        {/* Muscles */}
        {phase === 'exercise' && (
          <Text style={s.muscles}>{currentExercise.muscles.join(' · ')}</Text>
        )}
      </ScrollView>

      {/* Skip button */}
      <TouchableOpacity style={s.skipBtn} onPress={skip}>
        <SkipForward size={16} color={colors.textMuted} />
        <Text style={s.skipText}>{phase === 'rest' ? 'Saltar descanso' : 'Saltar ejercicio'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bgPrimary,
    paddingHorizontal: 20, gap: 12,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routineName: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  progressTrack: { height: 4, backgroundColor: colors.bgTertiary, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  scroll: { flex: 1 },
  scrollContent: { gap: 12, paddingBottom: 8 },
  iconWrap: { alignItems: 'center', gap: 12, marginTop: 16 },
  exerciseImage: { width: 160, height: 160, borderRadius: 16, backgroundColor: colors.bgSecondary },
  phaseLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  exerciseName: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  timer: { fontSize: 96, fontFamily: 'monospace', fontWeight: '800', color: colors.accent, textAlign: 'center' },
  repsCount: { fontSize: 56, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  doneBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  doneBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  muscles: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
  },
  skipText: { fontSize: 13, color: colors.textMuted },
})
