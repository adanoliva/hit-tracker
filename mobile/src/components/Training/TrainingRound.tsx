import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Line } from 'react-native-svg'
import type { Impact } from '../../core/types'
import { colors } from '../../theme'

const HIT_COLOR = '#c0c0c0'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const sc = seconds % 60
  return `${m}:${sc.toString().padStart(2, '0')}`
}

function ImpactChart({ impacts, powerMax, userPowerRef, width, height }: {
  impacts: Impact[]; powerMax: number; userPowerRef: number; width: number; height: number
}) {
  if (impacts.length === 0) {
    return (
      <View style={[chart.empty, { width, height }]}>
        <Text style={chart.emptyText}>Esperando golpes...</Text>
      </View>
    )
  }

  const chartValues = impacts.map((i) =>
    userPowerRef > 0 ? Math.round((i.magnitude / userPowerRef) * 100) : i.intensity
  )
  const maxValue = Math.max(...chartValues)
  const yMax = Math.max(105, maxValue + 5)
  const refLineValue = null

  const pad = { t: 10, r: 8, b: 10, l: 30 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b

  const tMin = impacts[0].time
  const tMax = Math.max(impacts[impacts.length - 1].time, tMin + 2000)
  const toX = (t: number) => pad.l + ((t - tMin) / (tMax - tMin)) * W
  const toY = (v: number) => pad.t + H - (v / yMax) * H

  const threshold = refLineValue != null ? toY(refLineValue) : null

  return (
    <Svg width={width} height={height}>
      {threshold != null && (
        <Line
          x1={pad.l} y1={threshold} x2={pad.l + W} y2={threshold}
          stroke={colors.textMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.4}
        />
      )}
      {impacts.map((impact, i) => {
        if (i === 0) return null
        const prev = impacts[i - 1]
        return (
          <Line
            key={`l${i}`}
            x1={toX(prev.time)} y1={toY(chartValues[i - 1])}
            x2={toX(impact.time)} y2={toY(chartValues[i])}
            stroke={colors.border} strokeWidth={1}
          />
        )
      })}
      {impacts.map((impact, i) => (
        <Circle key={`d${i}`} cx={toX(impact.time)} cy={toY(chartValues[i])} r={4} fill={HIT_COLOR} opacity={0.85} />
      ))}
    </Svg>
  )
}

interface TrainingRoundProps {
  roundNumber: number
  totalRounds: number
  timeRemaining: number
  timeElapsed: number
  isFreeMode: boolean
  impacts: Impact[]
  powerMax: number
  powerMaxMag: number
  userPowerRef: number
  hpmStats: { current: number; average: number; max: number }
  onAbort: () => void
  onFinish: () => void
}

export function TrainingRound({
  roundNumber, totalRounds, timeRemaining, timeElapsed, isFreeMode,
  impacts, powerMax, powerMaxMag, userPowerRef, hpmStats, onAbort, onFinish
}: TrainingRoundProps) {
  const { width } = useWindowDimensions()
  const { top } = useSafeAreaInsets()
  const chartWidth = width - 32  // padding 16*2
  const chartHeight = 200

  return (
    <View style={[s.container, { paddingTop: top + 16 }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.roundLabel}>Ronda</Text>
          <Text style={s.roundNum}>
            {roundNumber} <Text style={s.roundTotal}>/ {totalRounds}</Text>
          </Text>
        </View>
        <Text style={[s.timer, !isFreeMode && timeRemaining <= 10 && s.timerAlert]}>
          {isFreeMode ? formatTime(timeElapsed) : formatTime(timeRemaining)}
        </Text>
        <View style={s.headerBtns}>
          {isFreeMode && (
            <TouchableOpacity style={s.finishBtn} onPress={onFinish}>
              <Text style={s.finishText}>Finalizar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.abortBtn} onPress={onAbort}>
            <Text style={s.abortText}>Abortar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gráfico */}
      <View style={s.chartContainer}>
        <ImpactChart impacts={impacts} powerMax={powerMax} userPowerRef={userPowerRef} width={chartWidth} height={chartHeight} />
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatBox label="Golpes" value={impacts.length} />
        <StatBox label="Power máx" value={powerMaxMag} color={colors.accent} />
        <StatBox label="HPM" value={hpmStats.current} color={colors.secondary} />
      </View>
    </View>
  )
}

function StatBox({ label, value, color = colors.textPrimary }: { label: string; value: number; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundLabel: { fontSize: 11, color: colors.textMuted },
  roundNum: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  roundTotal: { fontSize: 18, color: colors.textMuted },
  timer: { fontSize: 52, fontFamily: 'monospace', fontWeight: '800', color: colors.textPrimary },
  timerAlert: { color: colors.accent },
  headerBtns: { gap: 6, alignItems: 'flex-end' },
  finishBtn: { borderWidth: 1, borderColor: colors.secondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  finishText: { fontSize: 12, color: colors.secondary, fontWeight: '700' },
  abortBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  abortText: { fontSize: 12, color: colors.textMuted },
  chartContainer: {
    backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden'
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1, backgroundColor: colors.bgSecondary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 10, alignItems: 'center'
  },
  statLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  statValue: { fontSize: 22, fontWeight: '800' }
})

const chart = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: colors.textMuted }
})
