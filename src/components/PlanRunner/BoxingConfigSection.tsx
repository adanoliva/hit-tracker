import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native'
import type { BoxingPhaseConfig } from '../../core/types'
import { colors } from '../../theme'

interface BoxingConfigSectionProps {
  value: BoxingPhaseConfig
  onChange: (v: BoxingPhaseConfig) => void
}

function OptionRow<T extends number>({
  label, options, selected, onSelect, format,
}: {
  label: string; options: T[]; selected: T; onSelect: (v: T) => void; format: (v: T) => string
}) {
  return (
    <View style={s.group}>
      <Text style={s.label}>{label}</Text>
      <View style={s.row}>
        {options.map((v) => (
          <TouchableOpacity
            key={v}
            style={[s.option, selected === v && s.optionActive]}
            onPress={() => onSelect(v)}
          >
            <Text style={[s.optionText, selected === v && s.optionTextActive]}>{format(v)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function BoxingConfigSection({ value, onChange }: BoxingConfigSectionProps) {
  const freeMode = value.roundDuration === 0

  const set = (patch: Partial<BoxingPhaseConfig>) => onChange({ ...value, ...patch })

  return (
    <View style={s.container}>
      <View style={s.freeModeRow}>
        <View>
          <Text style={s.freeModeLabel}>Modo libre</Text>
          <Text style={s.muted}>Sin límite de tiempo</Text>
        </View>
        <Switch
          value={freeMode}
          onValueChange={(v) => set({ roundDuration: v ? 0 : 180 })}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {!freeMode && (
        <>
          <OptionRow
            label="Duración por ronda"
            options={[60, 120, 180, 300] as any}
            selected={value.roundDuration as any}
            onSelect={(v) => set({ roundDuration: v })}
            format={(v) => v < 60 ? `${v}s` : `${v / 60}min`}
          />
          <OptionRow
            label="Descanso entre rondas"
            options={[10, 20, 30, 60, 90] as any}
            selected={value.restDuration as any}
            onSelect={(v) => set({ restDuration: v })}
            format={(v) => `${v}s`}
          />
        </>
      )}

      <OptionRow
        label="Número de rondas"
        options={[1, 3, 5, 8] as any}
        selected={value.numRounds as any}
        onSelect={(v) => set({ numRounds: v })}
        format={(v) => String(v)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { gap: 12 },
  group: { gap: 8 },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgSecondary, alignItems: 'center',
  },
  optionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  optionTextActive: { color: '#fff' },
  freeModeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border,
  },
  freeModeLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  muted: { fontSize: 12, color: colors.textMuted },
})
