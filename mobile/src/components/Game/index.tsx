import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native'
import { Dumbbell } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useSensorData } from '../../core/hooks/useSensorData'
import { useBleReading } from '../../core/hooks/useBleReading'
import type { CalibrationProfile } from '../../core/types'
import { colors } from '../../theme'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 12.0,
  sensitivity: 25.0,
  validHitThreshold: 80,
  createdAt: 0
}

export function GamePage() {
  const connected = useDeviceStore((s) => s.connected)
  const { top, bottom } = useSafeAreaInsets()

  const { impacts, processReading, reset } = useSensorData(DEFAULT_PROFILE)
  const [bestHit, setBestHit] = useState(0)
  const [lastHit, setLastHit] = useState(0)
  const [isRecord, setIsRecord] = useState(false)

  const flashAnim = useRef(new Animated.Value(0)).current
  const active = !!connected

  useBleReading({
    deviceId: connected?.mac ?? null,
    active,
    onReading: processReading
  })

  useEffect(() => {
    if (impacts.length === 0) return
    const last = impacts[impacts.length - 1]
    const mag = Math.round(last.magnitude)
    setLastHit(mag)
    if (mag > bestHit) {
      setBestHit(mag)
      setIsRecord(true)
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true })
      ]).start(() => setIsRecord(false))
    }
  }, [impacts])

  const handleReset = () => {
    reset()
    setBestHit(0)
    setLastHit(0)
    setIsRecord(false)
  }

  const flashOpacity = flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] })

  if (!connected) {
    return (
      <View style={[s.center, { paddingTop: top }]}>
        <Dumbbell size={48} color={colors.textMuted} />
        <Text style={s.emptyText}>Conecta un dispositivo{'\n'}para jugar</Text>
      </View>
    )
  }

  return (
    <View style={[s.root, { paddingTop: top, paddingBottom: bottom + 16 }]}>
      <Animated.View style={[s.flash, { opacity: flashOpacity }]} pointerEvents="none" />

      <View style={s.bestWrap}>
        <Text style={s.bestLabel}>MEJOR</Text>
        <Text style={[s.bestValue, isRecord && s.bestValueRecord]}>{bestHit}</Text>
      </View>

      <View style={s.currentWrap}>
        <Text style={s.currentLabel}>ACTUAL</Text>
        <Text style={s.currentValue}>{lastHit > 0 ? lastHit : '—'}</Text>
      </View>

      <TouchableOpacity style={s.resetBtn} onPress={handleReset} activeOpacity={0.7}>
        <Text style={s.resetText}>RESET</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
    zIndex: 0,
  },
  emptyIcon: {},
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  bestWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  bestLabel: {
    fontSize: 11,
    letterSpacing: 3,
    color: colors.textMuted,
  },
  bestValue: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.textMuted,
  },
  bestValueRecord: {
    color: colors.accent,
  },
  currentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLabel: {
    fontSize: 13,
    letterSpacing: 3,
    color: colors.textMuted,
    marginBottom: 8,
  },
  currentValue: {
    fontSize: 120,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
  resetBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
  },
  resetText: {
    fontSize: 14,
    letterSpacing: 2,
    color: colors.textMuted,
    fontWeight: '600',
  },
})
