import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Linking, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import appJson from '../../../app.json'
import Slider from '@react-native-community/slider'
import { useProfileStore } from '../../core/stores/profileStore'
import { useTrainingStore } from '../../core/stores/trainingStore'
import { useDeviceStore } from '../../core/stores/deviceStore'
import { useBleReading } from '../../core/hooks/useBleReading'
import { calibrationService } from '../../core/services/calibration'
import { sendProfileConfig, getSensorVersion } from '../../services/bleConnection'
import type { CalibrationProfile, HitWindow } from '../../core/types'
import type { SensorReading } from '../../core/types'
import { colors } from '../../theme'

type CalibStep = 'light' | 'heavy' | 'done' | 'error'
type CalibSubStep = 'waiting' | 'rebound' | 'accepted'
interface CalibWizardState {
  step: CalibStep
  subStep: CalibSubStep
  light: HitWindow[]
  heavy: HitWindow[]
  errorMsg?: string
  result?: { threshold: number; sensitivity: number; rebound: number }
}

const MIN_CALIB_HIT = 200       // minimum magnitude to count as a valid hit
const INTER_HIT_COOLDOWN = 1200 // ms between hits in wizard — always wait full rebound
const HITS_PER_SERIES = 3
const REBOUND_TIMEOUT_MS = 1000 // capture window per hit; user resting ≈ 151-178 raw
const STEP_LABELS: Record<Exclude<CalibStep, 'done' | 'error'>, string> = {
  light: 'Golpes suaves',
  heavy: 'Golpes fuertes',
}

function SliderField({
  label, hint, value, min, max, step, unit = '', color = colors.textPrimary, onChange
}: {
  label: string; hint: string; value: number; min: number; max: number
  step: number; unit?: string; color?: string; onChange: (v: number) => void
}) {
  return (
    <View style={sf.container}>
      <View style={sf.row}>
        <Text style={sf.label}>{label}</Text>
        <Text style={[sf.value, { color }]}>{value}{unit}</Text>
      </View>
      <Text style={sf.hint}>{hint}</Text>
      <Slider
        style={sf.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange(Math.round(v / step) * step)}
        minimumTrackTintColor={color}
        maximumTrackTintColor={colors.border}
        thumbTintColor={color}
      />
      <View style={sf.ends}>
        <Text style={sf.end}>{min}{unit}</Text>
        <Text style={sf.end}>{max}{unit}</Text>
      </View>
    </View>
  )
}

const sf = StyleSheet.create({
  container: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  value: { fontSize: 14, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  slider: { width: '100%', marginTop: 4 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { fontSize: 11, color: `${colors.textMuted}80` }
})

const APP_VERSION = appJson.expo.version
const WEB_URL = 'https://hit-tracker.es'
const PRIVACY_URL = 'https://hit-tracker.es/privacidad.html'

export function ProfilesPage({ onBack }: { onBack?: () => void }) {
  const { top } = useSafeAreaInsets()
  const { profiles, selectedProfileId, addProfile, updateProfile, deleteProfile, selectProfile } = useProfileStore()
  const deleteTrainingsByProfile = useTrainingStore((s) => s.deleteTrainingsByProfile)

  const confirmDeleteProfile = (p: CalibrationProfile) => {
    Alert.alert(
      'Eliminar perfil',
      `Se eliminará "${p.name}" y todas sus sesiones guardadas. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: () => {
            deleteTrainingsByProfile(p.id)
            deleteProfile(p.id)
          }
        }
      ]
    )
  }
  const connected = useDeviceStore((s) => s.connected)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<CalibrationProfile | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [calib, setCalib] = useState<CalibWizardState | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const [diagLog, setDiagLog] = useState<Array<{ mag: number; dt: number; isPeak: boolean }>>([])
  const lastDiagTimeRef   = useRef<number>(0)

  const prevReadingRef    = useRef<SensorReading | null>(null)
  const lastHitTimeRef    = useRef<number>(0)   // wall clock ms (Date.now())
  const subStepRef        = useRef<CalibSubStep>('waiting')
  const peakMagRef        = useRef(0)
  const peakTimeRef       = useRef(0)           // wall clock ms
  const reboundMaxRef     = useRef(0)
  const reboundTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeStep = calib?.step
  const wizardActive = calib !== null && activeStep !== 'done' && activeStep !== 'error'

  const recordHitWindow = useCallback(() => {
    if (reboundTimerRef.current) { clearTimeout(reboundTimerRef.current); reboundTimerRef.current = null }
    const window: HitWindow = {
      peak: peakMagRef.current,
      rebound: Date.now() - peakTimeRef.current,
      reboundMax: reboundMaxRef.current,
    }
    subStepRef.current = 'accepted'
    lastHitTimeRef.current = Date.now()

    setCalib((c) => {
      if (!c || c.step === 'done' || c.step === 'error') return c
      const { step, light, heavy } = c

      if (step === 'light') {
        const next = [...light, window]
        if (next.length === HITS_PER_SERIES) {
          subStepRef.current = 'waiting'
          return { ...c, light: next, step: 'heavy', heavy: [], subStep: 'waiting' }
        }
        subStepRef.current = 'waiting'
        return { ...c, light: next, subStep: 'waiting' }
      }
      if (step === 'heavy') {
        const next = [...heavy, window]
        if (next.length === HITS_PER_SERIES) {
          const result = calibrationService.analyzeCalibrationWindows(light, next)
          if (!result) return { ...c, heavy: next, step: 'error', subStep: 'waiting', errorMsg: 'Los golpes fuertes no fueron suficientemente distintos a los suaves. Inténtalo de nuevo.' }
          const profile = profiles.find((p) => p.id === selectedProfileId)
          if (profile) updateProfile(profile.id, { threshold: result.suggestedThreshold, sensitivity: result.suggestedSensitivity, rebound: result.suggestedRebound })
          return { ...c, heavy: next, step: 'done', subStep: 'waiting', result: { threshold: result.suggestedThreshold, sensitivity: result.suggestedSensitivity, rebound: result.suggestedRebound } }
        }
        subStepRef.current = 'waiting'
        return { ...c, heavy: next, subStep: 'waiting' }
      }
      return c
    })
  }, [profiles, selectedProfileId, updateProfile])

  useBleReading({
    deviceId: connected?.mac ?? null,
    active: wizardActive,
    onReading: (reading) => {
      const prev = prevReadingRef.current
      prevReadingRef.current = reading
      if (!prev) return

      const now = reading.timestamp
      const sub = subStepRef.current

      const wallNow = Date.now()  // use wall clock for all cooldown comparisons

      // Diagnostic log: capture every reading above baseline
      if (reading.magnitude > MIN_CALIB_HIT) {
        const dt = lastDiagTimeRef.current ? wallNow - lastDiagTimeRef.current : 0
        lastDiagTimeRef.current = wallNow
        const isPeak = sub === 'waiting' && reading.magnitude < prev.magnitude && prev.magnitude > MIN_CALIB_HIT
        setDiagLog((log) => [{ mag: Math.round(prev.magnitude), dt, isPeak }, ...log].slice(0, 12))
      }

      if (sub === 'waiting') {
        const isRising = reading.magnitude >= prev.magnitude
        if (!isRising && prev.magnitude > MIN_CALIB_HIT && wallNow - lastHitTimeRef.current > INTER_HIT_COOLDOWN) {
          peakMagRef.current = prev.magnitude
          peakTimeRef.current = wallNow
          reboundMaxRef.current = 0
          subStepRef.current = 'rebound'
          setCalib((c) => c ? { ...c, subStep: 'rebound' } : c)
          reboundTimerRef.current = setTimeout(recordHitWindow, REBOUND_TIMEOUT_MS)
        }
      } else if (sub === 'rebound') {
        // Always wait for REBOUND_TIMEOUT_MS — resting range (151-178) overlaps any
        // settled threshold, causing false early settlement on top-mounted sensors
        reboundMaxRef.current = Math.max(reboundMaxRef.current, reading.magnitude)
      }
    },
  })

  // Cancel wizard if sensor disconnects
  useEffect(() => {
    if (!connected && wizardActive) {
      setCalib({ step: 'error', subStep: 'waiting', light: [], heavy: [], errorMsg: 'Sensor desconectado. La calibración se ha cancelado.' })
    }
  }, [connected])

  const syncProfile = async () => {
    const profile = profiles.find((p) => p.id === selectedProfileId)
    if (!profile || !connected) return
    setSyncStatus('syncing')
    try {
      await sendProfileConfig(profile.threshold, profile.rebound ?? 400)
      setSyncStatus('ok')
      setTimeout(() => setSyncStatus('idle'), 2000)
    } catch {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }

  // Auto-sync when active profile changes (threshold/sensitivity edit or profile switch)
  useEffect(() => {
    if (!connected || getSensorVersion() !== 3) return
    syncProfile()
  }, [selectedProfileId, connected])

  const resetWizardRefs = () => {
    prevReadingRef.current = null
    lastHitTimeRef.current = 0
    lastDiagTimeRef.current = 0
    subStepRef.current = 'waiting'
    peakMagRef.current = 0
    peakTimeRef.current = 0
    reboundMaxRef.current = 0
    if (reboundTimerRef.current) { clearTimeout(reboundTimerRef.current); reboundTimerRef.current = null }
    setDiagLog([])
  }

  const openWizard = () => {
    resetWizardRefs()
    setCalib({ step: 'light', subStep: 'waiting', light: [], heavy: [] })
  }

  const repeatSeries = () => {
    resetWizardRefs()
    setCalib((c) => {
      if (!c) return c
      if (c.step === 'light') return { ...c, light: [], subStep: 'waiting' }
      if (c.step === 'heavy') return { ...c, heavy: [], subStep: 'waiting' }
      return c
    })
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    addProfile(calibrationService.createProfile(newName.trim()))
    setNewName('')
    setShowCreate(false)
  }

  const handleSaveEdit = () => {
    if (!editing) return
    updateProfile(editing.id, {
      name: editing.name, threshold: editing.threshold,
      sensitivity: editing.sensitivity,
    })
    setEditing(null)
  }

  return (
    <View style={s.wrapper}>
    <Modal visible={calib !== null} transparent animationType="fade" onRequestClose={() => setCalib(null)}>
      <View style={s.overlay}>
        <View style={s.modal}>
          {calib?.step === 'done' ? (
            <>
              <Text style={s.modalTitle}>Calibración completada</Text>
              <Text style={s.calibResult}>
                Detección: <Text style={{ color: colors.accent }}>{calib.result?.threshold}</Text>
                {'  '}Potencia: <Text style={{ color: colors.secondary }}>{calib.result?.sensitivity}</Text>
                {'  '}Rebote: <Text style={{ color: colors.textMuted }}>{calib.result?.rebound}ms</Text>
              </Text>
              <Text style={s.calibDesc}>Los valores han sido aplicados al perfil activo.</Text>
              <TouchableOpacity style={s.saveBtn} onPress={() => setCalib(null)}>
                <Text style={s.saveBtnText}>Listo</Text>
              </TouchableOpacity>
            </>
          ) : calib?.step === 'error' ? (
            <>
              <Text style={s.modalTitle}>Error</Text>
              <Text style={s.calibDesc}>{calib.errorMsg}</Text>
              <View style={s.editActions}>
                <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={openWizard}>
                  <Text style={s.saveBtnText}>Reintentar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setCalib(null)}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : calib !== null ? (
            <>
              <View style={s.calibHeader}>
                <Text style={s.modalTitle}>Calibración</Text>
                <TouchableOpacity onPress={() => setCalib(null)}>
                  <Text style={s.calibClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.calibStep}>{STEP_LABELS[calib.step as Exclude<CalibStep, 'done' | 'error'>]}</Text>
              {(() => {
                const arr = calib[calib.step as 'light' | 'heavy']
                const isRebound = calib.subStep === 'rebound'
                return (
                  <>
                    <Text style={s.calibCounter}>{arr.length} / {HITS_PER_SERIES}</Text>
                    <Text style={[s.calibStatus, isRebound && s.calibStatusActive]}>
                      {isRebound ? 'Registrando rebotes...' : 'Da un golpe'}
                    </Text>
                    <Text style={s.calibDesc}>
                      {calib.step === 'light' && 'Golpea el saco con suavidad 3 veces. Espera entre golpe y golpe.'}
                      {calib.step === 'heavy' && 'Golpea el saco con toda tu fuerza 3 veces. Espera entre golpe y golpe.'}
                    </Text>
                    <View style={s.diagPanel}>
                      <Text style={s.diagHeader}>mag     Δt</Text>
                      {diagLog.length === 0
                        ? <Text style={s.diagEmpty}>— esperando lecturas —</Text>
                        : diagLog.map((e, i) => (
                            <Text key={i} style={[s.diagRow, e.isPeak && s.diagPeak]}>
                              {String(e.mag).padStart(5)}   {i === diagLog.length - 1 ? '  —' : `+${e.dt}ms`}
                              {e.isPeak ? '  ◀ GOLPE' : ''}
                            </Text>
                          ))
                      }
                    </View>
                    <TouchableOpacity style={s.cancelBtn} onPress={repeatSeries}>
                      <Text style={s.cancelBtnText}>Repetir serie</Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
            </>
          ) : null}
        </View>
      </View>
    </Modal>

    <Modal visible={showAbout} transparent animationType="fade" onRequestClose={() => setShowAbout(false)}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAbout(false)}>
        <View style={s.modal}>
          <Text style={s.modalTitle}>HIT TRACKER</Text>
          <Text style={s.modalVersion}>v{APP_VERSION}</Text>
          <Text style={s.modalDesc}>
            Sistema de monitoreo de entrenamiento de boxeo en tiempo real. Detecta y registra golpes al saco mediante un sensor ESP32 conectado por Bluetooth.
          </Text>
          <TouchableOpacity onPress={() => Linking.openURL(WEB_URL)}>
            <Text style={s.modalLink}>{WEB_URL}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
            <Text style={s.modalLink}>Política de privacidad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.modalClose} onPress={() => setShowAbout(false)}>
            <Text style={s.modalCloseText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>

    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: top + 16 }]}>
      {onBack && (
        <View style={s.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={s.back}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>Perfiles</Text>
        </View>
      )}
      {!onBack && <Text style={s.title}>Perfiles</Text>}

      {profiles.map((p) => (
        <View key={p.id} style={[s.card, selectedProfileId === p.id && s.cardActive]}>
          {editing?.id === p.id ? (
            <View style={s.editForm}>
              <TextInput
                style={s.input}
                value={editing.name}
                onChangeText={(t) => setEditing({ ...editing, name: t })}
                placeholder="Nombre del perfil"
                placeholderTextColor={colors.textMuted}
              />

              <SliderField
                label="Mínimo de detección"
                hint="Fuerza mínima del golpe para que la app lo registre. Súbelo si detecta golpes que no das. Bájalo si se pierden golpes suaves."
                value={editing.threshold} min={0} max={100} step={5}
                color={colors.accent}
                onChange={(v) => setEditing({ ...editing, threshold: v })}
              />
              <SliderField
                label="Escala de potencia"
                hint="Cómo se convierte la fuerza del golpe en el marcador 0-100."
                value={editing.sensitivity} min={1} max={100} step={1}
                color={colors.secondary}
                onChange={(v) => setEditing({ ...editing, sensitivity: v })}
              />
              {/* ponytail: hidden=true — set to false to expose rebound tuning */}
              {false && (
                <SliderField
                  label="Ventana de rebote"
                  hint="Tiempo (ms) que el sensor espera tras un golpe antes de aceptar el siguiente."
                  value={editing!.rebound ?? 300} min={100} max={1500} step={50}
                  unit="ms"
                  color={colors.textMuted}
                  onChange={(v) => setEditing({ ...editing!, rebound: v })}
                />
              )}
              <View style={s.editActions}>
                <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={handleSaveEdit}>
                  <Text style={s.saveBtnText}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditing(null)}>
                  <Text style={s.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={s.cardRow}>
              <View style={s.flex1}>
                <Text style={s.profileName}>{p.name}</Text>
                <Text style={s.profileMeta}>
                  Detección {p.threshold} · Potencia {p.sensitivity}
                </Text>
                {selectedProfileId === p.id && (
                  <Text style={s.activeBadge}>● Activo</Text>
                )}
              </View>
              <View style={s.cardActions}>
                {selectedProfileId !== p.id && (
                  <TouchableOpacity style={s.useBtn} onPress={() => selectProfile(p.id)}>
                    <Text style={s.useBtnText}>Usar</Text>
                  </TouchableOpacity>
                )}
                {selectedProfileId === p.id && connected && getSensorVersion() === 3 && (
                  <TouchableOpacity
                    style={[s.calibBtn, syncStatus === 'ok' && s.syncBtnOk, syncStatus === 'error' && s.syncBtnErr]}
                    onPress={syncProfile}
                    disabled={syncStatus === 'syncing'}
                  >
                    <Text style={s.calibBtnText}>
                      {syncStatus === 'syncing' ? '...' : syncStatus === 'ok' ? '✓ Sync' : syncStatus === 'error' ? '✗ Error' : 'Sync'}
                    </Text>
                  </TouchableOpacity>
                )}
                {selectedProfileId === p.id && connected && (
                  <TouchableOpacity style={s.calibBtn} onPress={openWizard}>
                    <Text style={s.calibBtnText}>Calibrar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.editBtn} onPress={() => setEditing(p)}>
                  <Text style={s.editBtnText}>Editar</Text>
                </TouchableOpacity>
                {p.id !== 'default-v1' && (
                  <TouchableOpacity style={s.editBtn} onPress={() => confirmDeleteProfile(p)}>
                    <Text style={[s.editBtnText, { color: colors.accent }]}>Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {showCreate ? (
        <View style={s.createForm}>
          <Text style={s.fieldLabel}>Nuevo perfil</Text>
          <TextInput
            style={s.input}
            placeholder="Nombre del perfil"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            onSubmitEditing={handleCreate}
          />
          <View style={s.editActions}>
            <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={handleCreate}>
              <Text style={s.saveBtnText}>Crear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={s.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={s.addBtnText}>+ Nuevo perfil</Text>
        </TouchableOpacity>
      )}
    </ScrollView>

    <TouchableOpacity style={s.aboutBtn} onPress={() => setShowAbout(true)}>
      <Text style={s.aboutBtnText}>ⓘ</Text>
    </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 16, gap: 10, paddingBottom: 80 },
  aboutBtn: {
    position: 'absolute', bottom: 20, right: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center'
  },
  aboutBtnText: { fontSize: 18, color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modal: {
    backgroundColor: colors.bgSecondary, borderRadius: 16, padding: 24,
    width: '100%', gap: 12, borderWidth: 1, borderColor: colors.border
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  modalVersion: { fontSize: 13, color: colors.textMuted, marginTop: -6 },
  modalDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  modalLink: { fontSize: 13, color: colors.accent, textDecorationLine: 'underline' },
  modalClose: {
    marginTop: 4, backgroundColor: colors.bgTertiary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center'
  },
  modalCloseText: { color: colors.textSecondary, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  back: { fontSize: 22, color: colors.textMuted },
  title: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border
  },
  cardActive: { borderColor: colors.secondary },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  flex1: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  profileMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activeBadge: { fontSize: 12, color: colors.secondary, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  useBtn: { borderWidth: 1, borderColor: colors.secondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  useBtnText: { color: colors.secondary, fontSize: 12 },
  editBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editBtnText: { color: colors.textMuted, fontSize: 12 },
  editForm: { padding: 16, gap: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  editActions: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: 16, backgroundColor: colors.bgTertiary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontSize: 14 },
  input: {
    backgroundColor: colors.bgTertiary, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: colors.textPrimary, fontSize: 14
  },
  createForm: {
    backgroundColor: colors.bgSecondary, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, gap: 12
  },
  addBtn: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center'
  },
  addBtnText: { color: colors.textMuted, fontSize: 14 },
  calibBtn: { borderWidth: 1, borderColor: colors.accent, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  calibBtnText: { color: colors.accent, fontSize: 12 },
  syncBtnOk:  { borderColor: colors.secondary },
  syncBtnErr: { borderColor: colors.textMuted },
  calibHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calibClose: { fontSize: 18, color: colors.textMuted, padding: 4 },
  calibStep: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  calibCounter: { fontSize: 48, fontWeight: '800', color: colors.accent, textAlign: 'center', marginVertical: 12 },
  calibDesc: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  calibResult: { fontSize: 16, color: colors.textPrimary, marginVertical: 8 },
  calibStatus: { fontSize: 15, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  calibStatusActive: { color: colors.secondary },
  diagPanel: {
    backgroundColor: colors.bgPrimary, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border, gap: 2,
  },
  diagHeader: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginBottom: 4 },
  diagEmpty: { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace', textAlign: 'center', paddingVertical: 4 },
  diagRow: { fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace' },
  diagPeak: { color: colors.accent, fontWeight: '700' },
})
