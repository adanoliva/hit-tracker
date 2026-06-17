import { useState } from 'react'
import { useTrainingStore } from '../../stores/trainingStore'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProfileStore } from '../../stores/profileStore'

interface DashboardProps {
  onNavigate: (page: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps): JSX.Element {
  const trainings = useTrainingStore((s) => s.trainings)
  const deleteTraining = useTrainingStore((s) => s.deleteTraining)
  const connected = useDeviceStore((s) => s.connected)
  const getSelected = useProfileStore((s) => s.getSelected)
  const profile = getSelected()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const recent = trainings.slice(0, 5)

  return (
    <div className="p-6 space-y-6">
      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bg-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Dispositivo</p>
          {connected ? (
            <div>
              <p className="font-semibold text-secondary">{connected.name}</p>
              <p className="text-xs text-text-muted">{connected.mac}</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">Sin conexión</p>
          )}
        </div>
        <div className="bg-bg-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Perfil activo</p>
          <p className="font-semibold text-secondary">{profile.name}</p>
          <p className="text-xs text-text-muted capitalize">
            {profile.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}
          </p>
        </div>
      </div>

      {/* Quick action */}
      <button
        onClick={() => onNavigate('training')}
        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-4 rounded-xl text-lg transition-all"
      >
        ▶ Nueva sesión
      </button>

      {/* Recent trainings */}
      <div>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          Sesiones recientes
        </h2>
        {recent.length === 0 ? (
          <p className="text-text-muted text-sm">Sin sesiones todavía</p>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <div
                key={t.id}
                className="bg-bg-secondary rounded-lg p-3 border border-border hover:border-accent/40 transition-all"
              >
                {confirmDelete === t.id ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-text-primary">¿Eliminar esta sesión?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => { deleteTraining(t.id); setConfirmDelete(null) }}
                        className="text-xs bg-accent hover:bg-accent-hover text-white px-3 py-1 rounded transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs bg-bg-tertiary text-text-secondary px-3 py-1 rounded transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{t.device.name}</p>
                        <span className="text-xs text-secondary bg-secondary/10 px-1.5 py-0.5 rounded shrink-0">
                          {t.profile?.name ?? '—'}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {new Date(t.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {t.profile?.stance
                          ? ` · ${t.profile.stance === 'orthodox' ? 'Ortodoxo' : 'Southpaw'}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-accent">{t.totalImpacts} golpes</p>
                        <p className="text-xs text-text-muted">Power máx: {t.powerMax}</p>
                      </div>
                      <button
                        onClick={() => setConfirmDelete(t.id)}
                        className="text-text-muted hover:text-accent transition-colors mt-0.5"
                        title="Eliminar sesión"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
