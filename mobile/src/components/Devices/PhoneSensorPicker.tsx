import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { PhoneSensorPlacement } from '../../core/types'
import { colors } from '../../theme'

interface Option {
  value: PhoneSensorPlacement
  label: string
  description: string
  diagram: string
}

const OPTIONS: Option[] = [
  {
    value: 'front-vertical',
    label: 'Frontal vertical',
    description: 'El móvil se coloca de pie en la parte delantera del saco, con la pantalla mirando hacia fuera. Se puede sujetar con una cincha alrededor del saco.',
    diagram: [
      '    ┌───┐   ',
      '    │ 📱│   ',
      '  ══╪═══╪══ ',
      '    │   │   ',
      '    └───┘   ',
      '  [  SACO  ]',
    ].join('\n')
  },
  {
    value: 'top-horizontal',
    label: 'Horizontal encima',
    description: 'El móvil se coloca tumbado en la parte superior del saco, con la pantalla mirando hacia arriba. Ideal si el saco tiene una superficie plana arriba.',
    diagram: [
      '  ╔═════════╗',
      '  ║  📱     ║',
      '  ╚═════════╝',
      '  ┌─────────┐',
      '  │         │',
      '  │  SACO   │',
      '  └─────────┘',
    ].join('\n')
  }
]

interface PhoneSensorPickerProps {
  onConfirm: (placement: PhoneSensorPlacement) => void
  onCancel: () => void
}

export function PhoneSensorPicker({ onConfirm, onCancel }: PhoneSensorPickerProps) {
  const [selected, setSelected] = useState<PhoneSensorPlacement>('front-vertical')
  const insets = useSafeAreaInsets()

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom + 16, 36) }]}>
          <Text style={s.title}>Usar este móvil como sensor</Text>
          <Text style={s.subtitle}>
            El móvil detectará los golpes con sus propios sensores de movimiento.{'\n'}
            Elige cómo lo vas a colocar en el saco:
          </Text>

          <ScrollView style={s.options} contentContainerStyle={s.optionsContent}>
            {OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.option, selected === opt.value && s.optionActive]}
                onPress={() => setSelected(opt.value)}
              >
                <View style={s.optionHeader}>
                  <View style={s.radioOuter}>
                    {selected === opt.value && <View style={s.radioInner} />}
                  </View>
                  <Text style={[s.optionLabel, selected === opt.value && s.optionLabelActive]}>
                    {opt.label}
                  </Text>
                </View>

                <View style={s.diagram}>
                  <Text style={s.diagramText}>{opt.diagram}</Text>
                </View>

                <Text style={s.optionDesc}>{opt.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.actions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={() => onConfirm(selected)}>
              <Text style={s.confirmText}>Usar este móvil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: colors.bgSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 20, maxHeight: '90%'
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 16 },
  options: { flexGrow: 0 },
  optionsContent: { gap: 12, paddingBottom: 8 },
  option: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    padding: 14, gap: 10, backgroundColor: colors.bgTertiary
  },
  optionActive: { borderColor: colors.secondary, backgroundColor: `${colors.secondary}0d` },
  optionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center'
  },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.secondary },
  optionLabel: { fontSize: 15, fontWeight: '700', color: colors.textMuted },
  optionLabelActive: { color: colors.secondary },
  diagram: {
    backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 12, alignItems: 'center'
  },
  diagramText: { fontFamily: 'monospace', fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  optionDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.bgTertiary, alignItems: 'center'
  },
  cancelText: { fontSize: 15, color: colors.textSecondary },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: colors.secondary, alignItems: 'center'
  },
  confirmText: { fontSize: 15, fontWeight: '800', color: colors.bgPrimary }
})
