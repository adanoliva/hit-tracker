import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Vibration } from 'react-native'
import { Dumbbell } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useSensorData } from '../../core/hooks/useSensorData'
import { useBleReading } from '../../core/hooks/useBleReading'
import { useGameStore, minScoreForTop3 } from '../../core/stores/gameStore'
import type { CalibrationProfile } from '../../core/types'
import { colors } from '../../theme'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 12.0,
  sensitivity: 25.0,
  createdAt: 0
}

export function GamePage() {
  const connected = useDeviceStore((s) => s.connected)
  const { top, bottom } = useSafeAreaInsets()
  const { impacts, processReading, reset } = useSensorData(DEFAULT_PROFILE)
  const { topThree, phase, lastScore, pendingScore, startGame, cancelGame, registerHit, submitInitials, resetToIdle, loadScores } = useGameStore()
  const [initials, setInitials] = useState('')
  const hitRegistered = useRef(false)
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => { loadScores() }, [])

  useBleReading({ deviceId: connected?.mac ?? null, active: !!connected, onReading: processReading })

  useEffect(() => {
    if (phase === 'waiting') {
      hitRegistered.current = false
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true })
        ])
      )
      pulseLoop.current.start()
    } else {
      pulseLoop.current?.stop()
      pulseAnim.setValue(1)
    }
  }, [phase])

  useEffect(() => {
    if (phase === 'waiting' && impacts.length > 0 && !hitRegistered.current) {
      hitRegistered.current = true
      const last = impacts[impacts.length - 1]
      registerHit(last.magnitude)
      reset()
    }
  }, [impacts, phase])

  useEffect(() => {
    if (phase === 'new-record') {
      setInitials('')
      Vibration.vibrate([0, 100, 50, 100])
    } else if (phase === 'loser') {
      Vibration.vibrate(200)
    }
  }, [phase])

  const handleStart = () => { reset(); startGame() }

  const handleSubmit = async () => {
    if (initials.length === 0) return
    await submitInitials(initials)
    setInitials('')
  }

  if (!connected) {
    return (
      <View style={[s.center, { paddingTop: top }]}>
        <Dumbbell size={48} color={colors.textMuted} />
        <Text style={s.emptyText}>Conecta un dispositivo{'\n'}para jugar</Text>
      </View>
    )
  }

  return (
    <View style={[s.root, { paddingTop: top + 16, paddingBottom: bottom + 16 }]}>
      {/* TOP 3 */}
      <View style={s.topThreeWrap}>
        <Text style={s.label}>TOP 3</Text>
        {topThree.map((entry, i) => (
          <View key={i} style={s.scoreRow}>
            <Text style={s.scorePos}>{i + 1}.</Text>
            {entry ? (
              <>
                <Text style={s.scoreInitials}>{entry.initials}</Text>
                <Text style={s.scoreValue}>{entry.score}</Text>
              </>
            ) : (
              <>
                <Text style={s.scoreEmpty}>---</Text>
                <Text style={s.scoreEmpty}>---</Text>
              </>
            )}
          </View>
        ))}
      </View>

      {/* Center */}
      <View style={s.centerWrap}>
        {phase === 'idle' && (
          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.8}>
            <Text style={s.startText}>EMPEZAR</Text>
          </TouchableOpacity>
        )}

        {phase === 'waiting' && (
          <View style={s.waitingWrap}>
            <Animated.Text style={[s.golpea, { transform: [{ scale: pulseAnim }] }]}>
              ¡GOLPEA!
            </Animated.Text>
            <TouchableOpacity style={s.cancelBtn} onPress={cancelGame} activeOpacity={0.7}>
              <Text style={s.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'new-record' && (
          <View style={s.resultWrap}>
            <Text style={[s.resultLabel, { color: '#facc15' }]}>¡NUEVO RÉCORD!</Text>
            <Text style={[s.resultScore, { color: '#facc15' }]}>{pendingScore}</Text>
            <Text style={s.initialsLabel}>INTRODUCE TUS INICIALES</Text>
            <TextInput
              value={initials}
              onChangeText={t => setInitials(t.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4))}
              autoCapitalize="characters"
              maxLength={4}
              autoFocus
              style={s.initialsInput}
              placeholder="AAA"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity
              style={[s.confirmBtn, initials.length === 0 && s.confirmBtnDisabled]}
              onPress={handleSubmit}
              disabled={initials.length === 0}
              activeOpacity={0.8}
            >
              <Text style={s.confirmText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'loser' && (
          <View style={s.resultWrap}>
            <Text style={[s.resultLabel, { color: colors.accent }]}>LOSER</Text>
            <Text style={[s.resultScore, { color: colors.accent }]}>{lastScore}</Text>
            <Text style={s.minScore}>
              Necesitabas al menos{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {minScoreForTop3(topThree)}
              </Text>{' '}
              para entrar
            </Text>
            <TouchableOpacity style={s.backBtn} onPress={resetToIdle} activeOpacity={0.7}>
              <Text style={s.backText}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: 24 },
  center: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  label: { fontSize: 11, letterSpacing: 3, color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
  topThreeWrap: { gap: 6 },
  scoreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border
  },
  scorePos: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', width: 20 },
  scoreInitials: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: 'monospace', letterSpacing: 4, textAlign: 'center' },
  scoreValue: { fontSize: 18, fontWeight: '700', color: colors.secondary, fontFamily: 'monospace' },
  scoreEmpty: { flex: 1, fontSize: 14, color: colors.textMuted, fontFamily: 'monospace', textAlign: 'center' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  startBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 48, paddingVertical: 20 },
  startText: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 3 },
  waitingWrap: { alignItems: 'center', gap: 24 },
  golpea: { fontSize: 52, fontWeight: '800', color: colors.accent, letterSpacing: 2 },
  cancelBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  cancelText: { fontSize: 13, color: colors.textMuted, letterSpacing: 2 },
  resultWrap: { alignItems: 'center', gap: 16, width: '100%' },
  resultLabel: { fontSize: 11, letterSpacing: 4 },
  resultScore: { fontSize: 80, fontWeight: '800', fontFamily: 'monospace', lineHeight: 88 },
  initialsLabel: { fontSize: 11, letterSpacing: 3, color: colors.textMuted },
  initialsInput: {
    width: '100%', textAlign: 'center', fontSize: 32, fontWeight: '700',
    fontFamily: 'monospace', letterSpacing: 8, color: colors.textPrimary,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 12
  },
  confirmBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#facc15', alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', letterSpacing: 3 },
  minScore: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  backBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  backText: { fontSize: 13, letterSpacing: 2, color: colors.textMuted, fontWeight: '600' }
})
