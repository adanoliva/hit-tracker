import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Line, G } from 'react-native-svg'
import type { Impact, PunchType } from '../../core/types'
import { colors } from '../../theme'

const PUNCH_COLOR: Record<PunchType, string> = {
  'jab':        '#00d9ff',
  'cross':      '#ff4444',
  'right-hook': '#ff9900',
  'left-hook':  '#cc44ff',
  'unknown':    '#555555'
}
const PUNCH_LABEL: Record<PunchType, string> = {
  'jab': 'Jab', 'cross': 'Cross', 'right-hook': 'Hook D', 'left-hook': 'Hook I', 'unknown': '?'
}
const PUNCH_TYPES: PunchType[] = ['jab', 'cross', 'right-hook', 'left-hook']

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const sc = seconds % 60
  return `${m}:${sc.toString().padStart(2, '0')}`
}

function ImpactChart({ impacts, powerMax, width, height }: {
  impacts: Impact[]; powerMax: number; width: number; height: number
}) {
  if (impacts.length === 0) {
    return (
      <View style={[chart.empty, { width, height }]}>
        <Text style={chart.emptyText}>Esperando golpes...</Text>
      </View>
    )
  }

  const pad = { t: 10, r: 8, b: 10, l: 30 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b

  const tMin = impacts[0].time
  const tMax = Math.max(impacts[impacts.length - 1].time, tMin + 2000)
  const toX = (t: number) => pad.l + ((t - tMin) / (tMax - tMin)) * W
  const toY = (v: number) => pad.t + H - (v / 105) * H

  const threshold = powerMax > 0 ? toY(powerMax * 0.8) : null

  return (
    <Svg width={width} height={height}>
      {/* 80% threshold line */}
      {threshold != null && (
        <Line
          x1={pad.l} y1={threshold} x2={pad.l + W} y2={threshold}
          stroke={colors.textMuted} strokeWidth={1} strokeDasharray="4,4" opacity={0.4}
        />
      )}
      {/* Connecting line */}
      {impacts.map((impact, i) => {
        if (i === 0) return null
        const prev = impacts[i - 1]
        return (
          <Line
            key={`l${i}`}
            x1={toX(prev.time)} y1={toY(prev.intensity)}
            x2={toX(impact.time)} y2={toY(impact.intensity)}
            stroke={colors.border} strokeWidth={1}
          />
        )
      })}
      {/* Dots */}
      {impacts.map((impact, i) => {
        const cx = toX(impact.time)
        const cy = toY(impact.intensity)
        const color = PUNCH_COLOR[impact.punchType]
        const r = impact.isValid ? 6 : 4
        return (
          <G key={`d${i}`}>
            <Circle cx={cx} cy={cy} r={r} fill={color} opacity={impact.isValid ? 0.9 : 0.4} />
            {impact.isValid && (
              <Circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
            )}
          </G>
        )
      })}
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
  hpmStats: { current: number; average: number; max: number }
  onAbort: () => void
  onFinish: () => void
}

export function TrainingRound({
  roundNumber, totalRounds, timeRemaining, timeElapsed, isFreeMode,
  impacts, powerMax, powerMaxMag, hpmStats, onAbort, onFinish
}: TrainingRoundProps) {
  const { width } = useWindowDimensions()
  const { top } = useSafeAreaInsets()
  const chartWidth = width - 32  // padding 16*2
  const chartHeight = 200

  const validHits = impacts.filter((i) => i.isValid).length
  const counts = impacts.reduce<Partial<Record<PunchType, number>>>((acc, i) => {
    acc[i.punchType] = (acc[i.punchType] ?? 0) + 1
    return acc
  }, {})

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

      {/* Leyenda */}
      <View style={s.legend}>
        {PUNCH_TYPES.map((pt) => (
          <View key={pt} style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: PUNCH_COLOR[pt] }]} />
            <Text style={s.legendText}>
              {PUNCH_LABEL[pt]}
              {counts[pt] != null && (
                <Text style={{ color: PUNCH_COLOR[pt], fontWeight: '700' }}> {counts[pt]}</Text>
              )}
            </Text>
          </View>
        ))}
      </View>

      {/* Gráfico */}
      <View style={s.chartContainer}>
        <ImpactChart impacts={impacts} powerMax={powerMax} width={chartWidth} height={chartHeight} />
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <StatBox label="Golpes" value={impacts.length} />
        <StatBox label="Válidos" value={validHits} color={colors.accent} />
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.textMuted },
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
