import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useProfileStore } from '../../core/stores/profileStore'
import { colors } from '../../theme'

export function ProfilesPage() {
  const { profiles, selectedProfileId, selectProfile } = useProfileStore()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfiles</Text>
      {profiles.map((p) => (
        <View
          key={p.id}
          style={[styles.card, selectedProfileId === p.id && styles.cardActive]}
        >
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.muted}>
                {p.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}
                {' · '}Detección {p.threshold} · Potencia {p.sensitivity}
              </Text>
              {selectedProfileId === p.id && (
                <Text style={styles.active}>● Activo</Text>
              )}
            </View>
            {selectedProfileId !== p.id && (
              <TouchableOpacity style={styles.btn} onPress={() => selectProfile(p.id)}>
                <Text style={styles.btnText}>Usar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border
  },
  cardActive: { borderColor: colors.secondary },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  active: { fontSize: 12, color: colors.secondary, marginTop: 4 },
  btn: {
    borderWidth: 1, borderColor: colors.secondary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4
  },
  btnText: { color: colors.secondary, fontSize: 12 }
})
