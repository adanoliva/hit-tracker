import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { colors } from '../../theme'

export function DevicesPage() {
  const { devices, connected, setConnected, removeDevice } = useDeviceStore()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dispositivos</Text>

      <TouchableOpacity style={styles.scanBtn}>
        <Text style={styles.scanText}>+ Buscar dispositivo BLE</Text>
      </TouchableOpacity>

      {devices.length === 0 ? (
        <Text style={styles.muted}>Sin dispositivos guardados</Text>
      ) : (
        devices.map((d) => (
          <View key={d.mac} style={[styles.card, connected?.mac === d.mac && styles.cardActive]}>
            <View style={styles.flex1}>
              <Text style={styles.name}>{d.name}</Text>
              <Text style={styles.muted}>{d.mac}</Text>
              {connected?.mac === d.mac && <Text style={styles.connectedBadge}>● Conectado</Text>}
            </View>
            <View style={styles.actions}>
              {connected?.mac !== d.mac ? (
                <TouchableOpacity style={styles.btn} onPress={() => setConnected(d.mac)}>
                  <Text style={styles.btnText}>Conectar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => setConnected(null)}>
                  <Text style={styles.btnDangerText}>Desconectar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.btnMuted}
                onPress={() =>
                  Alert.alert('Eliminar', `¿Eliminar ${d.name}?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => removeDevice(d.mac) }
                  ])
                }
              >
                <Text style={styles.btnMutedText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
  scanBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center'
  },
  scanText: { color: colors.textMuted, fontSize: 14 },
  muted: { fontSize: 13, color: colors.textMuted },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center'
  },
  cardActive: { borderColor: colors.secondary },
  flex1: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  connectedBadge: { fontSize: 12, color: colors.secondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    borderWidth: 1, borderColor: colors.secondary, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4
  },
  btnText: { color: colors.secondary, fontSize: 12 },
  btnDanger: { borderColor: colors.accent },
  btnDangerText: { color: colors.accent, fontSize: 12 },
  btnMuted: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4
  },
  btnMutedText: { color: colors.textMuted, fontSize: 12 }
})
