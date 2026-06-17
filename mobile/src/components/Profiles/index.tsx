import { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import Slider from '@react-native-community/slider'
import { useProfileStore } from '../../core/stores/profileStore'
import { calibrationService } from '../../core/services/calibration'
import type { CalibrationProfile, Stance } from '../../core/types'
import { colors } from '../../theme'

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

export function ProfilesPage({ onBack }: { onBack?: () => void }) {
  const { profiles, selectedProfileId, addProfile, updateProfile, deleteProfile, selectProfile } = useProfileStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<CalibrationProfile | null>(null)

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
      sensitivity: editing.sensitivity, hookThreshold: editing.hookThreshold, stance: editing.stance
    })
    setEditing(null)
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
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

              {/* Guardia */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Guardia</Text>
                <Text style={s.fieldHint}>Define qué mano lanza el jab. El jab es siempre la mano delantera.</Text>
                <View style={s.stanceRow}>
                  {(['orthodox', 'southpaw'] as Stance[]).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[s.stanceBtn, editing.stance === st && s.stanceBtnActive]}
                      onPress={() => setEditing({ ...editing, stance: st })}
                    >
                      <Text style={[s.stanceBtnText, editing.stance === st && s.stanceBtnTextActive]}>
                        {st === 'orthodox' ? 'Ortodoxo · diestro' : 'Southpaw · zurdo'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.stanceDesc}>
                  {editing.stance === 'orthodox'
                    ? 'Jab = mano izquierda. Cross = mano derecha.'
                    : 'Jab = mano derecha. Cross = mano izquierda.'}
                </Text>
              </View>

              <View style={s.divider} />

              <SliderField
                label="Mínimo de detección"
                hint="Fuerza mínima del golpe para que la app lo registre. Súbelo si detecta golpes que no das. Bájalo si se pierden golpes suaves."
                value={editing.threshold} min={5} max={50} step={0.5}
                color={colors.accent}
                onChange={(v) => setEditing({ ...editing, threshold: v })}
              />
              <SliderField
                label="Escala de potencia"
                hint="Cómo se convierte la fuerza del golpe en el marcador 0-100."
                value={editing.sensitivity} min={5} max={60} step={0.5}
                color={colors.secondary}
                onChange={(v) => setEditing({ ...editing, sensitivity: v })}
              />
              <SliderField
                label="Detección de ganchos"
                hint="Rotación mínima para clasificar un golpe como gancho en vez de directo."
                value={editing.hookThreshold} min={40} max={200} step={5} unit="°/s"
                color={colors.secondary}
                onChange={(v) => setEditing({ ...editing, hookThreshold: v })}
              />

              <View style={s.editActions}>
                <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit}>
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
                  {p.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}
                  {' · '}Detección {p.threshold} · Potencia {p.sensitivity}
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
                <TouchableOpacity style={s.editBtn} onPress={() => setEditing(p)}>
                  <Text style={s.editBtnText}>Editar</Text>
                </TouchableOpacity>
                {p.id !== 'default-v1' && (
                  <TouchableOpacity style={s.editBtn} onPress={() => deleteProfile(p.id)}>
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
            <TouchableOpacity style={s.saveBtn} onPress={handleCreate}>
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
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
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
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  fieldHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  stanceRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  stanceBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgTertiary, alignItems: 'center'
  },
  stanceBtnActive: { backgroundColor: `${colors.secondary}20`, borderColor: colors.secondary },
  stanceBtnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  stanceBtnTextActive: { color: colors.secondary },
  stanceDesc: { fontSize: 12, color: `${colors.textMuted}99`, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.border },
  editActions: { flexDirection: 'row', gap: 10 },
  saveBtn: { flex: 1, backgroundColor: colors.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
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
  addBtnText: { color: colors.textMuted, fontSize: 14 }
})
