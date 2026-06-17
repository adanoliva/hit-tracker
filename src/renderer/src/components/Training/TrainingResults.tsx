import type { Training } from '../../types'

interface TrainingResultsProps {
  training: Training
  onDone: () => void
}

export function TrainingResults({ training, onDone }: TrainingResultsProps): JSX.Element {
  const bestRound = training.rounds.reduce(
    (best, r) => (r.stats.powerMax > best.stats.powerMax ? r : best),
    training.rounds[0]
  )

  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <p className="text-3xl font-bold text-text-primary">🥊 Entrenamiento completado</p>
        <p className="text-text-muted text-sm mt-1">
          {training.rounds.length} rondas · {training.device.name}
        </p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total golpes" value={training.totalImpacts} />
        <Stat label="Golpes válidos" value={training.validHits} color="text-accent" />
        <Stat label="Power máximo" value={training.powerMax} color="text-accent" />
        <Stat label="RPM promedio" value={training.rpmAverage} color="text-secondary" />
      </div>

      {/* Rounds breakdown */}
      <div>
        <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Por ronda</p>
        <div className="space-y-2">
          {training.rounds.map((r) => (
            <div
              key={r.number}
              className={`bg-bg-secondary rounded-lg p-3 border flex justify-between items-center transition-all ${
                r.number === bestRound?.number ? 'border-accent' : 'border-border'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-text-primary">
                  Ronda {r.number}
                  {r.number === bestRound?.number && (
                    <span className="ml-2 text-xs text-accent">★ Mejor</span>
                  )}
                </p>
                <p className="text-xs text-text-muted">{r.stats.totalImpacts} golpes</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-accent">{r.stats.powerMax}</p>
                <p className="text-xs text-secondary">{r.stats.rpmAverage} RPM</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onDone}
        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-4 rounded-xl text-lg transition-all"
      >
        ▶ Nueva sesión
      </button>
    </div>
  )
}

function Stat({
  label,
  value,
  color = 'text-text-primary'
}: {
  label: string
  value: number
  color?: string
}): JSX.Element {
  return (
    <div className="bg-bg-secondary rounded-xl p-4 border border-border text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
