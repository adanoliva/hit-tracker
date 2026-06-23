import { useRef } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Share2 } from 'lucide-react-native'
import type { Training } from '../../core/types'
import { colors } from '../../theme'
import { useShareSession } from '../../hooks/useShareSession'

interface TrainingResultsProps {
  training: Training
  onDone: () => void
}

function Stat({ label, value, color = colors.textPrimary }: { label: string; value: number; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  )
}

export function TrainingResults({ training, onDone }: TrainingResultsProps) {
  const { top } = useSafeAreaInsets()
  const statsRef = useRef<View>(null)
  const { share, isSharing } = useShareSession({ training, chartRef: statsRef })
  const bestRound = training.rounds.reduce(
    (best, r) => (r.stats.powerMax > best.stats.powerMax ? r : best),
    training.rounds[0]
  )

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: top + 16 }]}>
      <View style={s.heroSection}>
        <Text style={s.heroEmoji}>🥊</Text>
        <Text style={s.heroTitle}>Entrenamiento completado</Text>
        <Text style={s.muted}>{training.rounds.length} rondas · {training.device.name}</Text>
      </View>

      <View style={s.statsGrid} ref={statsRef}>
        <Stat label="Total golpes" value={training.totalImpacts} />
        <Stat label="Golpes válidos" value={training.validHits} color={colors.accent} />
        <Stat label="Power máximo" value={Math.max(0, ...training.rounds.flatMap(r => r.impacts).map(i => Math.round(i.magnitude)))} color={colors.accent} />
        <Stat label="HPM promedio" value={training.hpmAverage} color={colors.secondary} />
      </View>

      <Text style={s.sectionTitle}>Por ronda</Text>
      <View style={s.roundsList}>
        {training.rounds.map((r) => (
          <View
            key={r.number}
            style={[s.roundCard, r.number === bestRound?.number && s.roundCardBest]}
          >
            <View>
              <View style={s.roundHeader}>
                <Text style={s.roundName}>Ronda {r.number}</Text>
                {r.number === bestRound?.number && (
                  <Text style={s.bestBadge}>★ Mejor</Text>
                )}
              </View>
              <Text style={s.muted}>{r.stats.totalImpacts} golpes</Text>
            </View>
            <View style={s.roundRight}>
              <Text style={[s.roundValue, { color: colors.accent }]}>{Math.max(0, ...r.impacts.map(i => Math.round(i.magnitude)))}</Text>
              <Text style={[s.muted, { color: colors.secondary }]}>{r.stats.hpmAverage} HPM</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.shareBtn} onPress={share} disabled={isSharing} activeOpacity={0.7}>
        {isSharing
          ? <ActivityIndicator size={18} color="#fff" />
          : <Share2 size={18} color="#fff" />
        }
        <Text style={s.shareBtnText}>{isSharing ? 'Compartiendo…' : 'Compartir sesión'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.doneBtn} onPress={onDone}>
        <Text style={s.doneBtnText}>▶ Nueva sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 16, gap: 16, paddingBottom: 32 },
  heroSection: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  heroEmoji: { fontSize: 48 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: {
    flex: 1, minWidth: '45%', backgroundColor: colors.bgSecondary,
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center'
  },
  statLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4 },
  statValue: { fontSize: 32, fontWeight: '800' },
  sectionTitle: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  roundsList: { gap: 8 },
  roundCard: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  roundCardBest: { borderColor: colors.accent },
  roundHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roundName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  bestBadge: { fontSize: 12, color: colors.accent },
  roundRight: { alignItems: 'flex-end' },
  roundValue: { fontSize: 18, fontWeight: '800' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingVertical: 14, backgroundColor: colors.bgSecondary
  },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  doneBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  doneBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' }
})
