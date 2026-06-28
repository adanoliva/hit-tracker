import { useState } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronDown, ChevronUp, X } from 'lucide-react-native'
import type { BoxingPhaseConfig, BoxingRoundScript, WorkoutPlan } from '../../core/types'
import { useWorkoutPlanStore } from '../../core/stores/workoutPlanStore'
import { ExerciseSelector } from './ExerciseSelector'
import { BoxingConfigSection } from './BoxingConfigSection'
import { RoundComboEditor } from './RoundComboEditor'
import { colors } from '../../theme'

interface PlanBuilderProps {
  existingPlan?: WorkoutPlan
  onSave: () => void
  onCancel: () => void
}

const DEFAULT_BOXING: BoxingPhaseConfig = {
  roundDuration: 180,
  numRounds: 3,
  restDuration: 60,
  roundScripts: [],
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={s.sectionHeader} onPress={onToggle}>
      <Text style={s.sectionTitle}>{title}</Text>
      {open ? <ChevronUp size={16} color={colors.textMuted} /> : <ChevronDown size={16} color={colors.textMuted} />}
    </TouchableOpacity>
  )
}

export function PlanBuilder({ existingPlan, onSave, onCancel }: PlanBuilderProps) {
  const { top } = useSafeAreaInsets()
  const addPlan = useWorkoutPlanStore((s) => s.addPlan)
  const updatePlan = useWorkoutPlanStore((s) => s.updatePlan)

  const [name, setName] = useState(existingPlan?.name ?? '')
  const [warmupIds, setWarmupIds] = useState<string[]>(existingPlan?.warmupExerciseIds ?? [])
  const [coreIds, setCoreIds] = useState<string[]>(existingPlan?.coreExerciseIds ?? [])
  const [boxing, setBoxing] = useState<BoxingPhaseConfig>(existingPlan?.boxing ?? DEFAULT_BOXING)

  const [openWarmup, setOpenWarmup] = useState(false)
  const [openCore, setOpenCore] = useState(false)
  const [openCombos, setOpenCombos] = useState(false)

  const handleBoxingChange = (v: BoxingPhaseConfig) => {
    // Sync roundScripts when numRounds changes
    const scripts = v.roundScripts.filter((s) => s.round <= v.numRounds)
    setBoxing({ ...v, roundScripts: scripts })
  }

  const handleScriptsChange = (scripts: BoxingRoundScript[]) => {
    setBoxing((prev) => ({ ...prev, roundScripts: scripts }))
  }

  const handleSave = () => {
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      warmupExerciseIds: warmupIds,
      coreExerciseIds: coreIds,
      boxing,
    }
    if (existingPlan) updatePlan(existingPlan.id, data)
    else addPlan(data)
    onSave()
  }

  const canSave = name.trim().length > 0

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: top + 16 }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>{existingPlan ? 'Editar plan' : 'Nuevo plan'}</Text>
        <TouchableOpacity onPress={onCancel} hitSlop={12}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Nombre */}
      <View style={s.group}>
        <Text style={s.label}>Nombre del plan</Text>
        <TextInput
          style={s.nameInput}
          value={name}
          onChangeText={(t) => setName(t.slice(0, 40))}
          placeholder="Ej: Entrenamiento martes"
          placeholderTextColor={colors.textMuted}
          maxLength={40}
        />
      </View>

      {/* Calentamiento */}
      <View style={s.section}>
        <SectionHeader
          title={`Calentamiento${warmupIds.length > 0 ? ` (${warmupIds.length})` : ''}`}
          open={openWarmup}
          onToggle={() => setOpenWarmup((v) => !v)}
        />
        {openWarmup && (
          <ExerciseSelector category="warmup" selected={warmupIds} onChange={setWarmupIds} />
        )}
      </View>

      {/* Core / Fullbody */}
      <View style={s.section}>
        <SectionHeader
          title={`Core / Fullbody${coreIds.length > 0 ? ` (${coreIds.length})` : ''}`}
          open={openCore}
          onToggle={() => setOpenCore((v) => !v)}
        />
        {openCore && (
          <ExerciseSelector category={['core', 'fullbody']} selected={coreIds} onChange={setCoreIds} />
        )}
      </View>

      {/* Boxing config */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Rounds de boxeo</Text>
        <BoxingConfigSection value={boxing} onChange={handleBoxingChange} />
      </View>

      {/* Combos */}
      {boxing.roundDuration !== 0 && boxing.numRounds > 0 && (
        <View style={s.section}>
          <SectionHeader
            title="Combos por round"
            open={openCombos}
            onToggle={() => setOpenCombos((v) => !v)}
          />
          {openCombos && (
            <RoundComboEditor
              numRounds={boxing.numRounds}
              scripts={boxing.roundScripts}
              onChange={handleScriptsChange}
            />
          )}
        </View>
      )}

      {/* Guardar */}
      <TouchableOpacity
        style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        <Text style={s.saveText}>Guardar</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 16, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  group: { gap: 8 },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  nameInput: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14,
    fontSize: 16, color: colors.textPrimary,
  },
  section: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14, gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  saveBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.bgTertiary },
  saveText: { fontSize: 17, fontWeight: '800', color: '#fff' },
})
