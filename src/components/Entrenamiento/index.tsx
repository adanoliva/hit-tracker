import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Plus, ClipboardList, BookOpen } from 'lucide-react-native'
import type { WorkoutPlan } from '../../core/types'
import { useWorkoutPlanStore } from '../../core/stores/workoutPlanStore'
import { PlanCard } from './PlanCard'
import { PlanBuilder } from './PlanBuilder'
import { PlanRunner } from './PlanRunner'
import { CatalogScreen } from './CatalogScreen'
import { colors } from '../../theme'

type Screen = 'list' | 'builder' | 'running' | 'catalog'

export function EntrenamientoPage() {
  const { top } = useSafeAreaInsets()
  const plans = useWorkoutPlanStore((s) => s.plans)
  const deletePlan = useWorkoutPlanStore((s) => s.deletePlan)

  const [screen, setScreen] = useState<Screen>('list')
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)
  const [editingPlan, setEditingPlan] = useState<WorkoutPlan | undefined>(undefined)

  if (screen === 'running' && activePlan) {
    return (
      <PlanRunner
        plan={activePlan}
        onDone={() => { setActivePlan(null); setScreen('list') }}
        onAbort={() => { setActivePlan(null); setScreen('list') }}
      />
    )
  }

  if (screen === 'catalog') {
    return (
      <CatalogScreen
        onBack={() => setScreen('list')}
      />
    )
  }

  if (screen === 'builder') {
    return (
      <PlanBuilder
        existingPlan={editingPlan}
        onSave={() => { setEditingPlan(undefined); setScreen('list') }}
        onCancel={() => { setEditingPlan(undefined); setScreen('list') }}
      />
    )
  }

  return (
    <View style={[s.container, { paddingTop: top }]}>
      <View style={s.header}>
        <Text style={s.title}>Entrenamiento</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.iconBtn} onPress={() => setScreen('catalog')}>
            <BookOpen size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => { setEditingPlan(undefined); setScreen('builder') }}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {plans.length === 0 ? (
        <View style={s.empty}>
          <ClipboardList size={48} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Sin planes todavía</Text>
          <Text style={s.emptyMeta}>Crea tu primer entrenamiento con el botón +</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onRun={() => { setActivePlan(plan); setScreen('running') }}
              onEdit={() => { setEditingPlan(plan); setScreen('builder') }}
              onDelete={() => deletePlan(plan.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 10 },
  newBtn: {
    backgroundColor: colors.accent, borderRadius: 10,
    padding: 10,
  },
  list: { padding: 16, gap: 12 },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptyMeta: { fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
})
