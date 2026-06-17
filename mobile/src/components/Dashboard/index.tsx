import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect, Line, Circle, Text as SvgText, G } from 'react-native-svg'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import type { Training } from '../../core/types'
import { colors } from '../../theme'

function ProgressChart({ sessions, width }: { sessions: Training[]; width: number }) {
  const data = sessions.slice().reverse().slice(-8).map((t) => ({
    date: new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    rpm: Math.round(t.rpmAverage),
    power: t.powerMax
  }))

  if (data.length < 2) {
    return (
      <View style={chart.empty}>
        <Text style={chart.emptyText}>Necesitas al menos 2 sesiones para ver el progreso</Text>
      </View>
    )
  }

  const H = 110
  const pad = { t: 10, r: 28, b: 24, l: 28 }
  const W = width - pad.l - pad.r

  const maxRpm = Math.max(...data.map((d) => d.rpm), 1)
  const barW = Math.max(4, W / data.length - 6)

  const toX = (i: number) => pad.l + (i / (data.length - 1)) * W
  const toYRpm = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / (maxRpm * 1.1))
  const toYPower = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / 105)

  return (
    <Svg width={width} height={H}>
      {/* Bars (RPM) */}
      {data.map((d, i) => {
        const x = toX(i)
        const barH = (H - pad.t - pad.b) * (d.rpm / (maxRpm * 1.1))
        return (
          <Rect
            key={`b${i}`}
            x={x - barW / 2}
            y={H - pad.b - barH}
            width={barW}
            height={barH}
            rx={2}
            fill={colors.accent}
            opacity={0.6}
          />
        )
      })}

      {/* Line (Power) */}
      {data.map((d, i) => {
        if (i === 0) return null
        const prev = data[i - 1]
        return (
          <Line
            key={`l${i}`}
            x1={toX(i - 1)} y1={toYPower(prev.power)}
            x2={toX(i)} y2={toYPower(d.power)}
            stroke={colors.secondary}
            strokeWidth={2}
          />
        )
      })}
      {data.map((d, i) => (
        <Circle key={`c${i}`} cx={toX(i)} cy={toYPower(d.power)} r={3} fill={colors.secondary} />
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <SvgText
          key={`x${i}`}
          x={toX(i)}
          y={H - 4}
          fontSize={9}
          fill={colors.textMuted}
          textAnchor="middle"
        >
          {d.date}
        </SvgText>
      ))}
    </Svg>
  )
}

export function Dashboard({ onNavigate }: { onNavigate: (s: string) => void }) {
  const { top } = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const trainings = useTrainingStore((s) => s.trainings)
  const connected = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const profile = getSelected()
  const profileSessions = trainings.filter((t) => t.profile?.id === profile.id)

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: top + 16 }]}>
      {/* Status cards */}
      <View style={styles.row}>
        <View style={[styles.card, styles.flex1]}>
          <Text style={styles.label}>Dispositivo</Text>
          {connected ? (
            <>
              <Text style={styles.valueBlue}>{connected.name}</Text>
              <Text style={styles.muted}>{connected.mac}</Text>
            </>
          ) : (
            <Text style={styles.muted}>Sin conexión</Text>
          )}
        </View>
        <View style={[styles.card, styles.flex1]}>
          <Text style={styles.label}>Perfil activo</Text>
          <Text style={styles.valueBlue}>{profile.name}</Text>
          <Text style={styles.muted}>
            {profile.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}
          </Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.cta} onPress={() => onNavigate('training')}>
        <Text style={styles.ctaText}>▶ Nueva sesión</Text>
      </TouchableOpacity>

      {/* Progress chart */}
      {profileSessions.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>Progreso · {profile.name}</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.legendText}>RPM</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.secondary }]} />
                <Text style={styles.legendText}>Power</Text>
              </View>
            </View>
          </View>
          <ProgressChart sessions={profileSessions} width={width - 32 - 28} />
        </View>
      )}

      {/* Sessions */}
      <Text style={styles.sectionTitle}>Sesiones recientes · {profile.name}</Text>
      {profileSessions.length === 0 ? (
        <Text style={styles.muted}>Sin sesiones todavía</Text>
      ) : (
        profileSessions.map((t) => (
          <View key={t.id} style={styles.sessionCard}>
            <View>
              <Text style={styles.sessionDevice}>{t.device.name}</Text>
              <Text style={styles.muted}>
                {new Date(t.createdAt).toLocaleDateString('es-ES', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </Text>
            </View>
            <View style={styles.sessionStats}>
              <Text style={styles.valueRed}>{t.totalImpacts} golpes</Text>
              <Text style={styles.muted}>Power máx: {t.powerMax}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  valueBlue: { fontSize: 15, fontWeight: '700', color: colors.secondary },
  valueRed: { fontSize: 14, fontWeight: '700', color: colors.accent },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center'
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sectionTitle: {
    fontSize: 11, color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: 8
  },
  chartCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLine: { width: 12, height: 2, borderRadius: 1 },
  legendText: { fontSize: 10, color: colors.textMuted },
  sessionCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sessionDevice: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sessionStats: { alignItems: 'flex-end' }
})

const chart = StyleSheet.create({
  empty: { height: 50, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' }
})
