import { useState, useRef, useCallback } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import type { BoxingRoundScript } from '../../core/types'
import { exerciseService } from '../../core/services/exerciseService'
import { useCustomExerciseStore } from '../../core/stores/customExerciseStore'
import { colors } from '../../theme'

const NOTATION = [
  ['1', 'Jab'], ['2', 'Cross'], ['3', 'Gancho izq'], ['4', 'Gancho der'],
  ['5', 'Uppercut izq'], ['6', 'Uppercut der'],
  ['b', 'Al cuerpo (sufijo: 3b)'], ['Slip Iz / Slip Der', 'Esquiva'],
  ['Step', 'Paso de salida'], ['Duck', 'Agachada'], ['Pivot', 'Giro'],
]

interface RoundComboEditorProps {
  numRounds: number
  scripts: BoxingRoundScript[]
  onChange: (scripts: BoxingRoundScript[]) => void
}

export function RoundComboEditor({ numRounds, scripts, onChange }: RoundComboEditorProps) {
  const customExercises = useCustomExerciseStore((s) => s.exercises)
  const [showRef, setShowRef] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRefs = useRef<Record<number, TextInput | null>>({})

  const boxingExercises = [
    ...exerciseService.getByCategory('boxing'),
    ...customExercises.filter((e) => e.category === 'boxing'),
  ]

  const fillCombo = useCallback((round: number, name: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const next = scripts.filter((s) => s.round !== round)
    next.push({ round, combo: name })
    next.sort((a, b) => a.round - b.round)
    onChange(next)
    // Update native input value
    inputRefs.current[round]?.setNativeProps({ text: name })
  }, [scripts, onChange])

  const updateCombo = useCallback((round: number, combo: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const next = scripts.filter((s) => s.round !== round)
      if (combo.trim()) next.push({ round, combo: combo.slice(0, 120) })
      next.sort((a, b) => a.round - b.round)
      onChange(next)
    }, 300)
  }, [scripts, onChange])

  if (numRounds === 0) return null

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.refToggle} onPress={() => setShowRef((v) => !v)}>
        <Text style={s.refToggleText}>Ver referencia de golpes</Text>
        {showRef ? <ChevronUp size={14} color={colors.textMuted} /> : <ChevronDown size={14} color={colors.textMuted} />}
      </TouchableOpacity>

      {showRef && (
        <View style={s.refPanel}>
          {NOTATION.map(([code, name]) => (
            <View key={code} style={s.refRow}>
              <Text style={s.refCode}>{code}</Text>
              <Text style={s.refName}>{name}</Text>
            </View>
          ))}
        </View>
      )}

      {Array.from({ length: numRounds }, (_, i) => i + 1).map((round) => {
        const existing = scripts.find((s) => s.round === round)
        return (
          <View key={round} style={s.roundBlock}>
            <View style={s.roundRow}>
              <Text style={s.roundLabel}>R{round}</Text>
              <TextInput
                ref={(r) => { inputRefs.current[round] = r }}
                style={s.input}
                placeholder={`Combo round ${round}...`}
                placeholderTextColor={colors.textMuted}
                defaultValue={existing?.combo ?? ''}
                maxLength={120}
                onChangeText={(text) => updateCombo(round, text)}
                multiline
                numberOfLines={2}
              />
            </View>
            {boxingExercises.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips}>
                {boxingExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={s.chip}
                    onPress={() => fillCombo(round, ex.name)}
                  >
                    <Text style={s.chipText} numberOfLines={1}>{ex.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 8 },
  refToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  refToggleText: { fontSize: 12, color: colors.textMuted },
  refPanel: {
    backgroundColor: colors.bgTertiary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 10, gap: 4,
  },
  refRow: { flexDirection: 'row', gap: 12 },
  refCode: { fontSize: 12, fontWeight: '700', color: colors.accent, width: 100 },
  refName: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  roundBlock: { gap: 6 },
  roundRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, padding: 10,
  },
  roundLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    marginTop: 6, width: 24,
  },
  input: {
    flex: 1, color: colors.textPrimary, fontSize: 13,
    textAlignVertical: 'top', maxHeight: 60,
  },
  chips: { marginLeft: 2 },
  chip: {
    backgroundColor: colors.bgTertiary, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6,
  },
  chipText: { fontSize: 11, color: colors.textSecondary, maxWidth: 160 },
})
