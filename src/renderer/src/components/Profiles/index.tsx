import { useState } from 'react'
import { useProfileStore } from '../../stores/profileStore'
import { calibrationService } from '../../services/calibration'
import type { CalibrationProfile } from '../../types'
import pkg from '../../../../../package.json'

const APP_VERSION = pkg.version
const REPO_URL = 'https://github.com/adanoliva/hit-tracker'

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
  const [showAbout, setShowAbout] = useState(false)

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
      validHitThreshold: editing.validHitThreshold
    })
    setEditing(null)
  }

  return (
    <div className="flex flex-col h-full relative">
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-bg-secondary border border-border rounded-2xl p-6 max-w-sm w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold text-text-primary">HIT TRACKER</h2>
              <p className="text-xs text-text-muted">v{APP_VERSION}</p>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Sistema de monitoreo de entrenamiento de boxeo en tiempo real. Detecta y registra golpes al saco mediante un sensor ESP32 conectado por Bluetooth.
            </p>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent underline block"
            >
              {REPO_URL}
            </a>
            <button
              onClick={() => setShowAbout(false)}
              className="w-full bg-bg-tertiary text-text-secondary py-2 rounded-lg text-sm mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
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

                {/* Umbral golpe válido */}
                <SliderField
                  label="Umbral golpe válido"
                  hint="Un golpe cuenta como válido si supera este porcentaje de tu golpe más fuerte de la sesión. Con 80%, solo cuentan los golpes de al menos el 80% de tu máximo. Con 0%, todos los golpes son válidos."
                  value={editing.validHitThreshold ?? 80}
                  min={0}
                  max={100}
                  step={5}
                  unit="%"
                  color="text-text-primary"
                  onChange={(v) => setEditing({ ...editing, validHitThreshold: v })}
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
                    Detección <span className="text-accent">{p.threshold}</span>
                    {' · '}
                    Potencia <span className="text-secondary">{p.sensitivity}</span>
                    {' · '}
                    Válido ≥<span className="text-text-primary">{p.validHitThreshold ?? 80}%</span>
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

      <button
        onClick={() => setShowAbout(true)}
        className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-bg-secondary border border-border text-text-muted hover:text-text-primary hover:border-accent/40 text-xs font-bold transition-colors flex items-center justify-center"
        title="Acerca de"
      >
        i
      </button>
    </div>
  )
}
