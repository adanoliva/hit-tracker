import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, PermissionsAndroid, Platform
} from 'react-native'
import { BleManager } from 'react-native-ble-plx'
import { useDeviceStore } from '../../core/stores/deviceStore'
import type { Device, PhoneSensorPlacement } from '../../core/types'
import { PHONE_SENSOR_ID } from '../../core/types'
import { PhoneSensorPicker } from './PhoneSensorPicker'
import { colors } from '../../theme'

const bleManager = new BleManager()

async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  ])
  return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED)
}

type ScanState = 'idle' | 'scanning' | 'error'

interface FoundDevice { id: string; name: string }

export function DevicesPage({ onBack }: { onBack?: () => void }) {
  const { devices, connected, addDevice, updateDevice, removeDevice, setConnected } = useDeviceStore()

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState('')
  const [found, setFound] = useState<FoundDevice[]>([])
  const [editingMac, setEditingMac] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [showPhonePicker, setShowPhonePicker] = useState(false)

  const phoneDevice = devices.find((d) => d.mac === PHONE_SENSOR_ID)

  const handleAddPhone = (placement: PhoneSensorPlacement) => {
    setShowPhonePicker(false)
    const device: Device = {
      mac: PHONE_SENSOR_ID,
      name: placement === 'front-vertical' ? '📱 Este móvil — frontal' : '📱 Este móvil — encima',
      createdAt: Date.now(),
      lastSeen: Date.now(),
      placement
    }
    if (phoneDevice) {
      updateDevice(PHONE_SENSOR_ID, { name: device.name, placement })
    } else {
      addDevice(device)
    }
    setConnected(PHONE_SENSOR_ID)
  }

  // Detener escaneo al desmontar
  useEffect(() => () => { bleManager.stopDeviceScan() }, [])

  const startScan = useCallback(async () => {
    const granted = await requestBlePermissions()
    if (!granted) {
      Alert.alert('Permisos', 'Se necesitan permisos de Bluetooth para buscar dispositivos.')
      return
    }

    setScanState('scanning')
    setScanError('')
    setFound([])

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        bleManager.stopDeviceScan()
        setScanState('error')
        setScanError(error.message)
        return
      }
      if (device && device.name) {
        setFound((prev) => {
          if (prev.find((d) => d.id === device.id)) return prev
          return [...prev, { id: device.id, name: device.name! }]
        })
      }
    })

    // Auto-parar después de 15s
    setTimeout(() => {
      bleManager.stopDeviceScan()
      setScanState((prev) => prev === 'scanning' ? 'idle' : prev)
    }, 15000)
  }, [])

  const stopScan = () => {
    bleManager.stopDeviceScan()
    setScanState('idle')
    setFound([])
  }

  const selectDevice = (fd: FoundDevice) => {
    bleManager.stopDeviceScan()
    setScanState('idle')
    setFound([])

    const newDevice: Device = {
      mac: fd.id, name: fd.name,
      createdAt: Date.now(), lastSeen: Date.now()
    }
    if (!devices.find((d) => d.mac === fd.id)) addDevice(newDevice)
    setConnected(fd.id)
  }

  const handleRename = (mac: string) => {
    if (!editName.trim()) return
    updateDevice(mac, { name: editName.trim() })
    setEditingMac(null)
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {onBack && (
        <View style={s.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={s.back}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>Dispositivos</Text>
        </View>
      )}
      {!onBack && <Text style={s.title}>Dispositivos</Text>}

      {/* Dispositivos guardados */}
      {devices.length === 0 && scanState === 'idle' && (
        <Text style={s.muted}>Sin dispositivos registrados</Text>
      )}
      {devices.map((d) => (
        <View
          key={d.mac}
          style={[s.card, connected?.mac === d.mac && s.cardActive]}
        >
          {editingMac === d.mac ? (
            <View style={s.editRow}>
              <TextInput
                style={s.input}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                onSubmitEditing={() => handleRename(d.mac)}
              />
              <TouchableOpacity onPress={() => handleRename(d.mac)}>
                <Text style={s.saveText}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingMac(null)}>
                <Text style={s.muted}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.cardRow}>
              <View style={s.flex1}>
                <Text style={s.deviceName}>{d.name}</Text>
                <Text style={[s.muted, { fontFamily: 'monospace' }]}>{d.mac}</Text>
                {connected?.mac === d.mac && <Text style={s.activeBadge}>● Activo</Text>}
              </View>
              <View style={s.actions}>
                {connected?.mac === d.mac ? (
                  <TouchableOpacity style={s.btnDanger} onPress={() => setConnected(null)}>
                    <Text style={s.btnDangerText}>Desconectar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.btn} onPress={() => setConnected(d.mac)}>
                    <Text style={s.btnText}>Usar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.btnMuted}
                  onPress={() => { setEditingMac(d.mac); setEditName(d.name) }}
                >
                  <Text style={s.btnMutedText}>Renombrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.btnMuted}
                  onPress={() =>
                    Alert.alert('Eliminar', `¿Eliminar ${d.name}?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => removeDevice(d.mac) }
                    ])
                  }
                >
                  <Text style={[s.btnMutedText, { color: colors.accent }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ))}

      {/* Panel de escaneo */}
      {/* Opción: este móvil como sensor [solo mobile] */}
      {scanState === 'idle' && (
        <TouchableOpacity style={s.phoneBtn} onPress={() => setShowPhonePicker(true)}>
          <Text style={s.phoneBtnTitle}>📱 Usar este móvil como sensor</Text>
          <Text style={s.phoneBtnSub}>
            {phoneDevice
              ? `Configurado: ${phoneDevice.name.replace('📱 Este móvil — ', '')}`
              : 'El móvil detecta golpes con sus propios sensores'}
          </Text>
        </TouchableOpacity>
      )}

      {scanState === 'idle' && (
        <TouchableOpacity style={s.scanBtn} onPress={startScan}>
          <Text style={s.scanText}>+ Buscar dispositivo Bluetooth</Text>
        </TouchableOpacity>
      )}

      {showPhonePicker && (
        <PhoneSensorPicker
          onConfirm={handleAddPhone}
          onCancel={() => setShowPhonePicker(false)}
        />
      )}

      {scanState === 'scanning' && (
        <View style={s.scanPanel}>
          <View style={s.scanHeader}>
            <View style={s.scanningIndicator}>
              <ActivityIndicator size="small" color={colors.secondary} />
              <Text style={s.scanningText}>Buscando dispositivos...</Text>
            </View>
            <TouchableOpacity onPress={stopScan}>
              <Text style={s.cancelScanText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          {found.length === 0 ? (
            <Text style={s.muted}>Asegúrate de que el Bluetooth está activado y el saco encendido</Text>
          ) : (
            <View style={s.foundList}>
              <Text style={s.foundCount}>{found.length} dispositivo{found.length !== 1 ? 's' : ''} encontrado{found.length !== 1 ? 's' : ''}</Text>
              {found.map((fd) => (
                <TouchableOpacity key={fd.id} style={s.foundItem} onPress={() => selectDevice(fd)}>
                  <Text style={s.foundName}>{fd.name}</Text>
                  <Text style={[s.muted, { fontFamily: 'monospace' }]}>{fd.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {scanState === 'error' && (
        <View style={s.errorPanel}>
          <Text style={s.errorTitle}>Error al escanear</Text>
          <Text style={s.muted}>{scanError}</Text>
          <TouchableOpacity onPress={() => setScanState('idle')}>
            <Text style={s.cancelScanText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  back: { fontSize: 22, color: colors.textMuted },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  muted: { fontSize: 12, color: colors.textMuted },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.border
  },
  cardActive: { borderColor: colors.secondary },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  flex1: { flex: 1 },
  deviceName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  activeBadge: { fontSize: 12, color: colors.secondary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  btn: { borderWidth: 1, borderColor: colors.secondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  btnText: { color: colors.secondary, fontSize: 12 },
  btnDanger: { borderWidth: 1, borderColor: colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  btnDangerText: { color: colors.accent, fontSize: 12 },
  btnMuted: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  btnMutedText: { color: colors.textMuted, fontSize: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    color: colors.textPrimary, fontSize: 14
  },
  saveText: { color: colors.secondary, fontSize: 14 },
  phoneBtn: {
    borderWidth: 1, borderColor: `${colors.secondary}66`,
    borderRadius: 12, padding: 14, backgroundColor: `${colors.secondary}0d`
  },
  phoneBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.secondary },
  phoneBtnSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  scanBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center'
  },
  scanText: { color: colors.textMuted, fontSize: 14 },
  scanPanel: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12
  },
  scanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanningIndicator: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scanningText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  cancelScanText: { fontSize: 12, color: colors.textMuted },
  foundList: { gap: 8 },
  foundCount: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  foundItem: {
    backgroundColor: colors.bgTertiary, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.border
  },
  foundName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  errorPanel: {
    backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: `${colors.accent}66`, gap: 8
  },
  errorTitle: { fontSize: 14, fontWeight: '600', color: colors.accent }
})
