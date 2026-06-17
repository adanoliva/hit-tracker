import { useState } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { calibrationService } from '../../services/calibration'
import type { CalibrationProfile, Stance } from '../../types'

interface ProfilesPageProps {
  onBack: () => void
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit = '',
  color = 'text-text-primary',
  onChange
}: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  color?: string
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}{unit}</span>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{hint}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full mt-1"
      />
      <div className="flex justify-between text-xs text-text-muted/50">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export function ProfilesPage({ onBack }: ProfilesPageProps): JSX.Element {
  const { profiles, selectedProfileId, addProfile, updateProfile, deleteProfile, selectProfile } =
    useProfileStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<CalibrationProfile | null>(null)

  const handleCreate = () => {
    if (!newName.trim()) return
    const profile = calibrationService.createProfile(newName.trim())
    addProfile(profile)
    setNewName('')
    setShowCreate(false)
  }

  const handleSaveEdit = () => {
    if (!editing) return
    updateProfile(editing.id, {
      name: editing.name,
      threshold: editing.threshold,
      sensitivity: editing.sensitivity,
      hookThreshold: editing.hookThreshold,
      stance: editing.stance
    })
    setEditing(null)
  }

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-text-primary">Perfiles</h1>

      <div className="space-y-2">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`bg-bg-secondary rounded-xl border transition-all ${
              selectedProfileId === p.id ? 'border-secondary' : 'border-border hover:border-accent/40'
            }`}
          >
            {editing?.id === p.id ? (
              <div className="p-4 space-y-5">
                {/* Nombre */}
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-secondary outline-none"
                  placeholder="Nombre del perfil"
                />

                {/* Guardia */}
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Guardia</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Define qué mano lanza el jab. El jab es siempre la mano delantera.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(['orthodox', 'southpaw'] as Stance[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setEditing({ ...editing, stance: s })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                          editing.stance === s
                            ? 'bg-secondary/20 border-secondary text-secondary'
                            : 'bg-bg-tertiary border-border text-text-muted hover:border-secondary/40'
                        }`}
                      >
                        {s === 'orthodox' ? 'Ortodoxo · diestro' : 'Southpaw · zurdo'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted/70">
                    {editing.stance === 'orthodox'
                      ? 'Jab = mano izquierda adelante. Cross = mano derecha.'
                      : 'Jab = mano derecha adelante. Cross = mano izquierda.'}
                  </p>
                </div>

                {/* Separador */}
                <div className="border-t border-border" />

                {/* Mínimo de detección */}
                <SliderField
                  label="Mínimo de detección"
                  hint="Fuerza mínima del golpe para que la app lo registre. Súbelo si detecta golpes que no das (roces, vibraciones). Bájalo si se pierden golpes suaves."
                  value={editing.threshold}
                  min={5}
                  max={50}
                  step={0.5}
                  color="text-accent"
                  onChange={(v) => setEditing({ ...editing, threshold: v })}
                />

                {/* Escala de potencia */}
                <SliderField
                  label="Escala de potencia"
                  hint="Cómo se convierte la fuerza del golpe en el marcador 0-100. Súbelo si tus golpes más fuertes no llegan al 100. Bájalo si casi todos los golpes salen al máximo."
                  value={editing.sensitivity}
                  min={5}
                  max={60}
                  step={0.5}
                  color="text-secondary"
                  onChange={(v) => setEditing({ ...editing, sensitivity: v })}
                />

                {/* Detección de hooks */}
                <SliderField
                  label="Detección de ganchos"
                  hint="Rotación mínima del saco para clasificar un golpe como gancho (hook) en vez de directo. Súbelo si los directos se detectan como ganchos. Bájalo si los ganchos aparecen como directos."
                  value={editing.hookThreshold}
                  min={40}
                  max={200}
                  step={5}
                  unit="°/s"
                  color="text-secondary"
                  onChange={(v) => setEditing({ ...editing, hookThreshold: v })}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded-lg text-sm transition-colors"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 bg-bg-tertiary text-text-secondary py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {p.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}
                    {' · '}
                    Detección <span className="text-accent">{p.threshold}</span>
                    {' · '}
                    Potencia <span className="text-secondary">{p.sensitivity}</span>
                  </p>
                  {selectedProfileId === p.id && (
                    <p className="text-xs text-secondary mt-1">● Activo</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedProfileId !== p.id && (
                    <button
                      onClick={() => selectProfile(p.id)}
                      className="text-xs text-secondary border border-secondary/40 px-2 py-1 rounded hover:bg-secondary/10 transition-colors"
                    >
                      Usar
                    </button>
                  )}
                  <button
                    onClick={() => setEditing(p)}
                    className="text-xs text-text-muted border border-border px-2 py-1 rounded hover:text-text-primary transition-colors"
                  >
                    Editar
                  </button>
                  {p.id !== 'default-v1' && (
                    <button
                      onClick={() => deleteProfile(p.id)}
                      className="text-xs text-text-muted border border-border px-2 py-1 rounded hover:text-accent hover:border-accent/40 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate ? (
        <div className="bg-bg-secondary rounded-xl p-4 border border-border space-y-3">
          <p className="text-sm font-medium text-text-primary">Nuevo perfil</p>
          <input
            placeholder="Nombre del perfil"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-secondary outline-none transition-colors"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded-lg text-sm transition-colors"
            >
              Crear
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 bg-bg-tertiary text-text-secondary py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full border border-dashed border-border hover:border-accent/50 text-text-muted hover:text-text-primary py-3 rounded-xl text-sm transition-all"
        >
          + Nuevo perfil
        </button>
      )}
    </div>
  )
}
