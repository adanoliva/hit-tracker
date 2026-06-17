import { useState } from 'react'
import { useDeviceStore } from '../../stores/deviceStore'
import { useProfileStore } from '../../stores/profileStore'

interface TrainingSetupProps {
  onStart: (roundDuration: number, numRounds: number, restDuration: number) => void
  onBack: () => void
}

export function TrainingSetup({ onStart, onBack }: TrainingSetupProps): JSX.Element {
  const [roundDuration, setRoundDuration] = useState(180)
  const [numRounds, setNumRounds] = useState(3)
  const [restDuration, setRestDuration] = useState(60)

  const connected = useDeviceStore((s) => s.connected)
  const profiles = useProfileStore((s) => s.profiles)
  const selectedId = useProfileStore((s) => s.selectedProfileId)
  const selectProfile = useProfileStore((s) => s.selectProfile)

  const canStart = !!connected

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors">
          ←
        </button>
        <h1 className="text-xl font-bold text-text-primary">Nueva sesión</h1>
      </div>

      {/* Device status */}
      <div
        className={`rounded-xl p-4 border ${
          connected
            ? 'bg-bg-secondary border-secondary/40'
            : 'bg-bg-secondary border-accent/40'
        }`}
      >
        <p className={`text-sm font-medium ${connected ? 'text-secondary' : 'text-accent'}`}>
          {connected ? `✓ ${connected.name}` : '✗ Sin dispositivo conectado'}
        </p>
        {!connected && (
          <p className="text-xs text-text-muted mt-1">Conecta un saco en la sección Dispositivos</p>
        )}
      </div>

      {/* Profile selector */}
      <div>
        <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">Perfil</label>
        <select
          value={selectedId}
          onChange={(e) => selectProfile(e.target.value)}
          className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:border-secondary outline-none transition-colors"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Round config */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">
            Duración por ronda
          </label>
          <div className="flex gap-2">
            {[60, 120, 180, 300].map((s) => (
              <button
                key={s}
                onClick={() => setRoundDuration(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  roundDuration === s
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent/50'
                }`}
              >
                {s < 60 ? `${s}s` : `${s / 60}min`}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">
            Número de rondas
          </label>
          <div className="flex gap-2">
            {[1, 3, 5, 8].map((n) => (
              <button
                key={n}
                onClick={() => setNumRounds(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  numRounds === n
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">
            Descanso entre rondas
          </label>
          <div className="flex gap-2">
            {[30, 60, 90].map((s) => (
              <button
                key={s}
                onClick={() => setRestDuration(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  restDuration === s
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary border border-border hover:border-accent/50'
                }`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary rounded-xl p-4 border border-border text-sm text-text-muted">
        <p>
          Total: {numRounds} × {roundDuration / 60}min + {numRounds - 1} × {restDuration}s descanso
        </p>
        <p className="text-text-muted text-xs mt-1">
          ≈ {Math.round((numRounds * roundDuration + (numRounds - 1) * restDuration) / 60)} minutos
        </p>
      </div>

      <button
        onClick={() => onStart(roundDuration, numRounds, restDuration)}
        disabled={!canStart}
        className="w-full bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary disabled:text-text-muted text-white font-bold py-4 rounded-xl text-lg transition-all"
      >
        Iniciar entrenamiento
      </button>
    </div>
  )
}
