import type { RoundStats } from '../../types'

interface TrainingRestProps {
  restTimeRemaining: number
  currentRound: number
  totalRounds: number
  roundStats: RoundStats | null
  previousRoundStats: RoundStats | null
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TrainingRest({
  restTimeRemaining,
  currentRound,
  totalRounds,
  roundStats,
  previousRoundStats
}: TrainingRestProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-6">
      <div className="text-center">
        <p className="text-text-muted text-sm uppercase tracking-wider">Descanso</p>
        <p className="text-6xl font-mono font-bold text-secondary mt-2">
          {formatTime(restTimeRemaining)}
        </p>
        <p className="text-text-muted text-sm mt-2">
          Ronda {currentRound} / {totalRounds} completada
        </p>
      </div>

      {roundStats && (
        <div className="w-full bg-bg-secondary rounded-xl p-4 border border-border space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider">Ronda {currentRound}</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-text-primary">{roundStats.totalImpacts}</p>
              <p className="text-xs text-text-muted">Golpes</p>
            </div>
            <div>
              <p className="text-lg font-bold text-accent">{roundStats.powerMax}</p>
              <p className="text-xs text-text-muted">Power máx</p>
            </div>
            <div>
              <p className="text-lg font-bold text-secondary">{roundStats.hpmAverage}</p>
              <p className="text-xs text-text-muted">HPM avg</p>
            </div>
          </div>

          {previousRoundStats && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-text-muted mb-1">vs ronda anterior</p>
              <div className="flex gap-4 text-xs">
                <Delta label="Golpes" current={roundStats.totalImpacts} previous={previousRoundStats.totalImpacts} />
                <Delta label="Power" current={roundStats.powerMax} previous={previousRoundStats.powerMax} />
                <Delta label="HPM" current={roundStats.hpmAverage} previous={previousRoundStats.hpmAverage} />
              </div>
            </div>
          )}

          {roundStats.isFatigued && (
            <p className="text-xs text-accent bg-accent/10 rounded px-2 py-1">
              ⚠ Fatiga detectada en esta ronda
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Delta({ label, current, previous }: { label: string; current: number; previous: number }): JSX.Element {
  const diff = current - previous
  const color = diff > 0 ? 'text-secondary' : diff < 0 ? 'text-accent' : 'text-text-muted'
  const sign = diff > 0 ? '+' : ''
  return (
    <span className="text-text-muted">
      {label}: <span className={color}>{sign}{diff}</span>
    </span>
  )
}
