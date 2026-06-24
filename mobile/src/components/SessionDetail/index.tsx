import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  useWindowDimensions, Alert, ActivityIndicator
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Share2 } from 'lucide-react-native'
import { useTrainingStore } from '../../core/stores/trainingStore'
import type { Training, Round } from '../../core/types'
import { colors } from '../../theme'
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg'
import { useShareSession } from '../../hooks/useShareSession'

interface SessionDetailProps {
  training: Training
  onBack: () => void
  onDelete: (id: string) => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const sc = total % 60
  return `${m}:${sc.toString().padStart(2, '0')}`
}

function RoundChart({ round, width }: { round: Round; width: number }) {
  if (round.impacts.length === 0) {
    return (
      <View style={chart.empty}>
        <Text style={chart.emptyText}>Sin golpes registrados en este round</Text>
      </View>
    )
  }

  const H = 140
  const pad = { t: 10, r: 12, b: 24, l: 28 }
  const W = width - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const mags = round.impacts.map(i => i.magnitude ?? 0)
  const magMin = Math.min(...mags)
  const magMax = Math.max(...mags)
  const magRange = magMax - magMin || 1

  const tMin = round.impacts[0].time
  const tMax = Math.max(round.impacts[round.impacts.length - 1].time, tMin + 1000)
  const durationSec = Math.round((tMax - tMin) / 1000)

  const toX = (t: number) => pad.l + ((t - tMin) / (tMax - tMin)) * W
  const toY = (mag: number) => pad.t + innerH - ((mag - magMin) / magRange) * innerH

  const xTicks = [0, Math.round(durationSec / 2), durationSec]

  return (
    <Svg width={width} height={H}>
      <Line x1={pad.l} x2={pad.l + W} y1={pad.t} y2={pad.t} stroke={colors.border} strokeWidth={1} />
      <Line x1={pad.l} x2={pad.l + W} y1={pad.t + innerH} y2={pad.t + innerH} stroke={colors.border} strokeWidth={1} />
      <SvgText x={pad.l - 4} y={pad.t + 4} textAnchor="end" fontSize={9} fill={colors.textMuted}>{Math.round(magMax)}</SvgText>
      <SvgText x={pad.l - 4} y={pad.t + innerH + 4} textAnchor="end" fontSize={9} fill={colors.textMuted}>{Math.round(magMin)}</SvgText>
      {xTicks.map((v) => (
        <SvgText key={`xl${v}`} x={toX(tMin + v * 1000)} y={H - 4}
          textAnchor="middle" fontSize={9} fill={colors.textMuted}>{v}s</SvgText>
      ))}
      {round.impacts.map((impact, i) => (
        <Circle key={i} cx={toX(impact.time)} cy={toY(impact.magnitude ?? 0)}
          r={5} fill={colors.accent} opacity={0.85} />
      ))}
    </Svg>
  )
}

export function SessionDetail({ training, onBack, onDelete }: SessionDetailProps) {
  const [selectedRound, setSelectedRound] = useState(0)
  const deleteTraining = useTrainingStore((s) => s.deleteTraining)
  const { top } = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const chartWidth = width - 32 - 24
  const chartRef = useRef<View>(null)
  const { share, isSharing } = useShareSession({ training, chartRef })

  const round = training.rounds[selectedRound]
  const powerMax = Math.max(0, ...training.rounds.flatMap(r => r.impacts).map(i => Math.round(i.magnitude)))

  const handleDelete = () => {
    Alert.alert(
      '¿Eliminar esta sesión?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: () => {
            deleteTraining(training.id)
            onDelete(training.id)
            onBack()
          }
        }
      ]
    )
  }

  return (
    <View style={[s.container, { paddingTop: top + 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerDevice}>{training.device.name}</Text>
          <Text style={s.headerDate}>{formatDate(training.createdAt)}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity onPress={share} disabled={isSharing} style={s.shareBtn}>
            {isSharing
              ? <ActivityIndicator size={14} color={colors.textMuted} />
              : <Share2 size={16} color={colors.textMuted} />
            }
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={s.deleteBtn}>
            <Text style={s.deleteText}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Global stats */}
      <View style={s.globalStats}>
        {[
          { label: 'Rounds', value: training.rounds.length, color: colors.textPrimary },
          { label: 'Golpes', value: training.totalImpacts, color: colors.accent },
          { label: 'Power máx', value: powerMax, color: colors.secondary },
          { label: 'HPM prom.', value: Math.round(training.hpmAverage), color: colors.textPrimary },
        ].map(({ label, value, color }) => (
          <View key={label} style={s.globalStat}>
            <Text style={s.statLabel}>{label}</Text>
            <Text style={[s.statValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Round tabs */}
      <View style={s.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsContent}>
          {training.rounds.map((r, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setSelectedRound(i)}
              style={[s.tab, selectedRound === i && s.tabActive]}
            >
              <Text style={[s.tabText, selectedRound === i && s.tabTextActive]}>R{r.number}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Round content */}
      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {round && (
          <>
            <View ref={chartRef} collapsable={false} style={s.shareCapture}>
              {/* Round stats */}
              <View style={s.roundStats}>
                {[
                  { label: 'Golpes', value: round.stats.totalImpacts },
                  { label: 'Power máx', value: Math.max(0, ...round.impacts.map(i => Math.round(i.magnitude ?? 0))) },
                  { label: 'HPM', value: round.stats.hpmAverage },
                  { label: 'Duración', value: formatDuration(round.stats.duration) },
                ].map(({ label, value }) => (
                  <View key={label} style={s.roundStat}>
                    <Text style={s.statLabel}>{label}</Text>
                    <Text style={s.roundStatValue}>{value}</Text>
                  </View>
                ))}
              </View>

              {/* Chart */}
              <View style={s.chartCard}>
                <RoundChart round={round} width={chartWidth} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border
  },
  backBtn: { paddingVertical: 4 },
  backText: { fontSize: 13, color: colors.textMuted },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerDevice: { fontSize: 11, color: colors.textMuted },
  headerDate: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareBtn: { padding: 6 },
  deleteBtn: { paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 6 },
  deleteText: { fontSize: 11, color: colors.textMuted },
  globalStats: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border
  },
  globalStat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  tabs: { borderBottomWidth: 1, borderBottomColor: colors.border },
  tabsContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  tab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  tabActive: { backgroundColor: colors.accent },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  content: { flex: 1 },
  contentInner: { padding: 16, gap: 12 },
  shareCapture: { backgroundColor: colors.bgPrimary, gap: 12 },
  roundStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roundStat: {
    backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', minWidth: 60, flex: 1
  },
  roundStatValue: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  chartCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 12,
  },
})

const chart = StyleSheet.create({
  empty: { height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted }
})
