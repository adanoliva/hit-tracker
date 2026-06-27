import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Flame, Dumbbell, Target } from 'lucide-react-native'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { colors } from '../../theme'

export interface PhaseConfig {
  includeWarmup: boolean
  includeCore: boolean
}

interface TrainingSetupProps {
  onStart: (roundDuration: number, numRounds: number, restDuration: number, phases: PhaseConfig) => void
  onBack: () => void
}

function OptionRow<T extends number>({
  label,
  options,
  selected,
  onSelect,
  format
}: {
  label: string
  options: T[]
  selected: T
  onSelect: (v: T) => void
  format: (v: T) => string
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
            <Text style={[s.optionText, selected === v && s.optionTextActive]}>
              {format(v)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

export function TrainingSetup({ onStart, onBack }: TrainingSetupProps) {
  const { top } = useSafeAreaInsets()
  const [freeMode, setFreeMode] = useState(false)
  const [roundDuration, setRoundDuration] = useState(180)
  const [numRounds, setNumRounds] = useState(3)
  const [restDuration, setRestDuration] = useState(60)
  const [includeWarmup, setIncludeWarmup] = useState(false)
  const [includeCore, setIncludeCore] = useState(false)

  const connected = useDeviceStore((s) => s.connected)
  const profiles = useProfileStore((s) => s.profiles)
  const selectedId = useProfileStore((s) => s.selectedProfileId)
  const selectProfile = useProfileStore((s) => s.selectProfile)

  const boxingSecs = freeMode ? 0 : numRounds * roundDuration + (numRounds - 1) * restDuration
  const physicalMins = (includeWarmup ? 8 : 0) + (includeCore ? 15 : 0)
  const totalMins = physicalMins + Math.ceil(boxingSecs / 60)

  const handleStart = () => {
    if (!connected) return
    const phases: PhaseConfig = { includeWarmup, includeCore }
    if (freeMode) onStart(0, 1, 0, phases)
    else onStart(roundDuration, numRounds, restDuration, phases)
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: top + 16 }]}>
      <Text style={s.title}>Nueva sesión</Text>

      {/* Estado dispositivo */}
      <View style={[s.deviceCard, connected ? s.deviceOk : s.deviceError]}>
        <Text style={[s.deviceText, connected ? s.deviceTextOk : s.deviceTextError]}>
          {connected ? `✓ ${connected.name}` : '✗ Sin dispositivo conectado'}
        </Text>
        {!connected && (
          <Text style={s.muted}>Conecta un saco en la sección Dispositivos</Text>
        )}
      </View>

      {/* Selector de perfil */}
      <View style={s.group}>
        <Text style={s.label}>Perfil</Text>
        <View style={s.row}>
          {profiles.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[s.option, selectedId === p.id && s.optionActive, s.profileOption]}
              onPress={() => selectProfile(p.id)}
            >
              <Text style={[s.optionText, selectedId === p.id && s.optionTextActive]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Modo libre */}
      <View style={s.freeModeRow}>
        <View>
          <Text style={s.freeModeLabel}>Modo libre</Text>
          <Text style={s.muted}>Sin límite de tiempo — tú decides cuándo parar</Text>
        </View>
        <Switch
          value={freeMode}
          onValueChange={setFreeMode}
          trackColor={{ false: colors.border, true: colors.accent }}
          thumbColor="#fff"
        />
      </View>

      {!freeMode && <>
        <OptionRow
          label="Duración por ronda"
          options={[60, 120, 180, 300] as const as any}
          selected={roundDuration}
          onSelect={setRoundDuration}
          format={(v) => v < 60 ? `${v}s` : `${v / 60}min`}
        />
        <OptionRow
          label="Número de rondas"
          options={[1, 3, 5, 8] as const as any}
          selected={numRounds}
          onSelect={setNumRounds}
          format={(v) => String(v)}
        />
        <OptionRow
          label="Descanso entre rondas"
          options={[10, 20, 30, 60, 90] as const as any}
          selected={restDuration}
          onSelect={setRestDuration}
          format={(v) => `${v}s`}
        />
      </>}

      {!freeMode && <View style={s.summary}>
        <Text style={s.summaryText}>
          Total: {numRounds} × {roundDuration / 60}min + {numRounds - 1} × {restDuration}s descanso
        </Text>
        <Text style={s.muted}>≈ {totalMins} minutos{physicalMins > 0 ? ` (${physicalMins} min físico + ${totalMins - physicalMins} min boxeo)` : ''}</Text>
      </View>}

      {/* Fases de la sesión */}
      <View style={s.phasesSection}>
        <Text style={s.label}>Fases de la sesión</Text>

        <View style={s.phaseRow}>
          <Flame size={18} color={colors.accent} style={s.phaseIcon} />
          <View style={s.phaseInfo}>
            <Text style={s.phaseTitle}>Calentamiento <Text style={s.phaseDuration}>(8 min)</Text></Text>
            <Text style={s.muted}>Movilidad y activación</Text>
          </View>
          <Switch
            value={includeWarmup}
            onValueChange={setIncludeWarmup}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={s.phaseRow}>
          <Dumbbell size={18} color={colors.secondary} style={s.phaseIcon} />
          <View style={s.phaseInfo}>
            <Text style={s.phaseTitle}>Core <Text style={s.phaseDuration}>(15 min)</Text></Text>
            <Text style={s.muted}>Abdominales y estabilidad</Text>
          </View>
          <Switch
            value={includeCore}
            onValueChange={setIncludeCore}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <View style={[s.phaseRow, s.phaseRowFixed]}>
          <Target size={18} color={colors.textMuted} style={s.phaseIcon} />
          <View style={s.phaseInfo}>
            <Text style={s.phaseTitle}>Rounds de saco</Text>
            <Text style={s.muted}>Configurado arriba</Text>
          </View>
          <Text style={s.alwaysOn}>Siempre</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[s.startBtn, !connected && s.startBtnDisabled]}
        onPress={handleStart}
        disabled={!connected}
      >
        <Text style={s.startText}>Iniciar entrenamiento</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 16, gap: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { fontSize: 22, color: colors.textMuted, paddingRight: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  deviceCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  deviceOk: { backgroundColor: colors.bgSecondary, borderColor: `${colors.secondary}66` },
  deviceError: { backgroundColor: colors.bgSecondary, borderColor: `${colors.accent}66` },
  deviceText: { fontSize: 14, fontWeight: '600' },
  deviceTextOk: { color: colors.secondary },
  deviceTextError: { color: colors.accent },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  group: { gap: 8 },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgSecondary, alignItems: 'center'
  },
  optionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  profileOption: { flex: 0, paddingHorizontal: 14 },
  optionText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  optionTextActive: { color: '#fff' },
  freeModeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border
  },
  freeModeLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  summary: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border
  },
  summaryText: { fontSize: 13, color: colors.textPrimary },
  startBtn: {
    backgroundColor: colors.accent, borderRadius: 12,
    paddingVertical: 18, alignItems: 'center'
  },
  startBtnDisabled: { backgroundColor: colors.bgTertiary },
  startText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  phasesSection: { gap: 8 },
  phaseRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12,
  },
  phaseRowFixed: { opacity: 0.6 },
  phaseIcon: { width: 20 },
  phaseInfo: { flex: 1 },
  phaseTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  phaseDuration: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  alwaysOn: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
})
