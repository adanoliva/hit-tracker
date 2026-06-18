import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { PhoneSensorPlacement } from '../../core/types'
import { colors } from '../../theme'

const PLACEMENT_IMAGE = require('../../../assets/sensor-placement.png')

interface Option {
  value: PhoneSensorPlacement
  label: string
  description: string
}

const OPTIONS: Option[] = [
  {
    value: 'front-vertical',
    label: 'Frontal vertical',
    description: 'El móvil de pie en la parte delantera del saco, pantalla (letras) de frente hacia ti y la flecha del volumen apuntando hacia abajo.',
  },
  {
    value: 'top-horizontal',
    label: 'Horizontal encima',
    description: 'El móvil tumbado en la parte superior del saco, pantalla (letras) hacia arriba y la parte superior del móvil apuntando hacia ti.',
  }
]

interface PhoneSensorPickerProps {
  onConfirm: (placement: PhoneSensorPlacement) => void
  onCancel: () => void
}

export function PhoneSensorPicker({ onConfirm, onCancel }: PhoneSensorPickerProps) {
  const [selected, setSelected] = useState<PhoneSensorPlacement>('front-vertical')
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const imgWidth = width - 40 - 28 // sheet padding + modal margin
  const imgHeight = imgWidth * 0.72

  return (
    <Modal transparent animationType="slide" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom + 16, 36) }]}>
          <Text style={s.title}>Usar este móvil como sensor</Text>
          <Text style={s.subtitle}>
            Coloca el móvil en el saco igual que el sensor de la imagen.{'\n'}
            Elige la posición que mejor se adapte:
          </Text>

          {/* Imagen de referencia */}
          <View style={s.imageWrap}>
            <Image
              source={PLACEMENT_IMAGE}
              style={[s.image, { width: imgWidth, height: imgHeight }]}
              resizeMode="contain"
            />
            <View style={s.imageLabels}>
              <Text style={[s.imageLabel, selected === 'front-vertical' && s.imageLabelActive]}>
                Frontal
              </Text>
              <Text style={[s.imageLabel, selected === 'top-horizontal' && s.imageLabelActive]}>
                Encima
              </Text>
            </View>
          </View>

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
    padding: 20, maxHeight: '92%'
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 14 },
  imageWrap: {
    backgroundColor: colors.bgPrimary, borderRadius: 12, padding: 12,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.border
  },
  image: { borderRadius: 8 },
  imageLabels: {
    flexDirection: 'row', justifyContent: 'space-around',
    width: '100%', marginTop: 8
  },
  imageLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  imageLabelActive: { color: colors.secondary, fontWeight: '700' },
  options: { flexGrow: 0 },
  optionsContent: { gap: 10, paddingBottom: 4 },
  option: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 14,
    padding: 14, gap: 8, backgroundColor: colors.bgTertiary
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
  optionDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
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
