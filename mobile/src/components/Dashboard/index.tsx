import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Rect, Line, Circle, Text as SvgText } from 'react-native-svg'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import type { Training } from '../../core/types'
import { colors } from '../../theme'

function sessionPowerMax(t: Training) {
  const mags = t.rounds.flatMap(r => r.impacts).map(i => Math.round(i.magnitude))
  return mags.length > 0 ? Math.max(...mags) : 0
}

function ProgressChart({ sessions, width }: { sessions: Training[]; width: number }) {
  const data = sessions.slice().reverse().slice(-8).map((t) => ({
    date: new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    hpm: Math.round(t.hpmAverage) || 0,
    power: sessionPowerMax(t)
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

  const maxHpm = Math.max(...data.map((d) => d.hpm), 1)
  const maxPower = Math.max(...data.map((d) => d.power), 1)
  const barW = Math.max(4, W / data.length - 6)

  const toX = (i: number) => pad.l + (i / (data.length - 1)) * W
  const toYRpm = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / (maxHpm * 1.1))
  const toYPower = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / (maxPower * 1.1))

  return (
    <Svg width={width} height={H}>
      {data.map((d, i) => {
        const x = toX(i)
        const barH = (H - pad.t - pad.b) * (d.hpm / (maxHpm * 1.1))
        return (
          <Rect key={`b${i}`} x={x - barW / 2} y={H - pad.b - barH}
            width={barW} height={barH} rx={2} fill={colors.accent} opacity={0.6} />
        )
      })}
      {data.map((d, i) => {
        if (i === 0) return null
        const prev = data[i - 1]
        return (
          <Line key={`l${i}`} x1={toX(i - 1)} y1={toYPower(prev.power)}
            x2={toX(i)} y2={toYPower(d.power)} stroke={colors.secondary} strokeWidth={2} />
        )
      })}
      {data.map((d, i) => (
        <Circle key={`c${i}`} cx={toX(i)} cy={toYPower(d.power)} r={3} fill={colors.secondary} />
      ))}
      {data.map((d, i) => (
        <SvgText key={`x${i}`} x={toX(i)} y={H - 4} fontSize={9} fill={colors.textMuted} textAnchor="middle">
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
  const removeTraining = useTrainingStore((s) => s.deleteTraining)
  const connected = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const profile = getSelected()
  const profileSessions = trainings.filter((t) => t.profile?.id === profile.id)

  const handleDelete = (t: Training) => {
    Alert.alert(
      'Eliminar sesión',
      `¿Eliminar la sesión del ${new Date(t.createdAt).toLocaleDateString('es-ES')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeTraining(t.id) }
      ]
    )
  }

  return (
    <View style={[styles.container, { paddingTop: top + 16 }]}>
      {/* Parte superior fija */}
      <View style={styles.topContent}>
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
                  <Text style={styles.legendText}>HPM</Text>
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

        <Text style={styles.sectionTitle}>Sesiones recientes · {profile.name}</Text>
      </View>

      {/* Lista de sesiones con scroll propio */}
      {profileSessions.length === 0 ? (
        <Text style={[styles.muted, { paddingHorizontal: 16 }]}>Sin sesiones todavía</Text>
      ) : (
        <FlatList
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
          data={[...profileSessions].reverse()}
          keyExtractor={(t) => t.id}
          renderItem={({ item: t }) => (
            <View style={styles.sessionCard}>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionDevice}>{t.device.name}</Text>
                <Text style={styles.muted}>
                  {new Date(t.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
              <View style={styles.sessionStats}>
                <Text style={styles.valueRed}>{t.totalImpacts} golpes</Text>
                <Text style={styles.muted}>Power máx: {sessionPowerMax(t)}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(t)}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  topContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 8 },
  sessionList: { flex: 1 },
  sessionListContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: colors.border
  },
  label: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  valueBlue: { fontSize: 15, fontWeight: '700', color: colors.secondary },
  valueRed: { fontSize: 14, fontWeight: '700', color: colors.accent },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cta: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sectionTitle: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
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
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', gap: 8
  },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sessionStats: { alignItems: 'flex-end' },
  deleteBtn: { padding: 6 },
  deleteIcon: { fontSize: 16 }
})

const chart = StyleSheet.create({
  empty: { height: 50, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: colors.textMuted, textAlign: 'center' }
})
