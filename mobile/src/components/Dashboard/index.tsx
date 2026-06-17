import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useProfileStore } from '../../core/stores/profileStore'
import { colors } from '../../theme'

export function Dashboard({ onNavigate }: { onNavigate: (s: string) => void }) {
  const trainings = useTrainingStore((s) => s.trainings)
  const connected = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const profile = getSelected()
  const profileSessions = trainings.filter((t) => t.profile?.id === profile.id)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* Sessions */}
      <Text style={styles.sectionTitle}>Sesiones recientes · {profile.name}</Text>
      {profileSessions.length === 0 ? (
        <Text style={styles.muted}>Sin sesiones todavía</Text>
      ) : (
        profileSessions.slice(0, 5).map((t) => (
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
  content: { padding: 16, gap: 12 },
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
