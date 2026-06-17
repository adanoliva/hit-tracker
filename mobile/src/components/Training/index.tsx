import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../theme'

// Placeholder — implementación completa en siguiente iteración
export function TrainingPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pantalla de entrenamiento</Text>
      <Text style={styles.muted}>Próximamente</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  muted: { fontSize: 14, color: colors.textMuted, marginTop: 8 }
})
