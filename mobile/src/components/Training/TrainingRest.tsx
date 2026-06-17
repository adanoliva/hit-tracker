import { View, Text, StyleSheet } from 'react-native'
import type { RoundStats } from '../../core/types'
import { colors } from '../../theme'

interface TrainingRestProps {
  restTimeRemaining: number
  currentRound: number
  totalRounds: number
  roundStats: RoundStats | null
  previousRoundStats: RoundStats | null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function Delta({ label, current, previous }: { label: string; current: number; previous: number }) {
  const diff = current - previous
  const color = diff > 0 ? colors.secondary : diff < 0 ? colors.accent : colors.textMuted
  return (
    <Text style={s.muted}>
      {label}: <Text style={{ color }}>{diff > 0 ? '+' : ''}{diff}</Text>
    </Text>
  )
}

export function TrainingRest({
  restTimeRemaining, currentRound, totalRounds, roundStats, previousRoundStats
}: TrainingRestProps) {
  return (
    <View style={s.container}>
      <View style={s.center}>
        <Text style={s.restLabel}>Descanso</Text>
        <Text style={s.timer}>{formatTime(restTimeRemaining)}</Text>
        <Text style={s.muted}>Ronda {currentRound} / {totalRounds} completada</Text>
      </View>

      {roundStats && (
        <View style={s.card}>
          <Text style={s.cardLabel}>Ronda {currentRound}</Text>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{roundStats.totalImpacts}</Text>
              <Text style={s.muted}>Golpes</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.accent }]}>{roundStats.powerMax}</Text>
              <Text style={s.muted}>Power máx</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: colors.secondary }]}>{roundStats.rpmAverage}</Text>
              <Text style={s.muted}>RPM avg</Text>
            </View>
          </View>

          {previousRoundStats && (
            <View style={s.delta}>
              <Text style={[s.muted, { marginBottom: 4 }]}>vs ronda anterior</Text>
              <View style={s.deltaRow}>
                <Delta label="Golpes" current={roundStats.totalImpacts} previous={previousRoundStats.totalImpacts} />
                <Delta label="Power" current={roundStats.powerMax} previous={previousRoundStats.powerMax} />
                <Delta label="RPM" current={roundStats.rpmAverage} previous={previousRoundStats.rpmAverage} />
              </View>
            </View>
          )}

          {roundStats.isFatigued && (
            <View style={s.fatigue}>
              <Text style={s.fatigueText}>⚠ Fatiga detectada en esta ronda</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  center: { alignItems: 'center', gap: 8 },
  restLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  timer: { fontSize: 72, fontFamily: 'monospace', fontWeight: '800', color: colors.secondary },
  muted: { fontSize: 12, color: colors.textMuted },
  card: { width: '100%', backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  delta: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 },
  deltaRow: { flexDirection: 'row', gap: 16 },
  fatigue: { backgroundColor: `${colors.accent}1a`, borderRadius: 8, padding: 8 },
  fatigueText: { fontSize: 12, color: colors.accent }
})
