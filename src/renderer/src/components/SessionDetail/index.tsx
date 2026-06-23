import { useState, useRef, useEffect } from 'react'
import { useTrainingStore } from '../../stores/trainingStore'
import type { Training, Round } from '../../types'

interface SessionDetailProps {
  training: Training
  onBack: () => void
  onDelete: (id: string) => void
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function RoundChart({ round }: { round: Round }): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(520)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => setW(entries[0].contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 220
  const pad = { t: 16, r: 16, b: 32, l: 36 }
  const innerW = W - pad.l - pad.r
  const innerH = H - pad.t - pad.b
  const durationSec = (round.endTime - round.startTime) / 1000
  const xMax = Math.max(durationSec, 1)

  const toX = (t: number) => pad.l + ((t - round.startTime) / 1000 / xMax) * innerW
  const toY = (v: number) => pad.t + innerH - (v / 100) * innerH

  const xTicks = [0, Math.round(xMax / 2), Math.round(xMax)]
  const yTicks = [0, 25, 50, 75, 100]

  return (
    <div ref={containerRef}>
      {round.impacts.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-text-muted text-sm">
          Sin golpes registrados en este round
        </div>
      ) : (
        <svg width={W} height={H}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={pad.l + innerW} y1={toY(v)} y2={toY(v)}
                stroke="#2a2a2a" strokeWidth={1} />
              <text x={pad.l - 4} y={toY(v) + 4} textAnchor="end"
                fontSize={11} fill="#808080">{v}</text>
            </g>
          ))}
          {xTicks.map((v) => (
            <text key={v} x={toX(round.startTime + v * 1000)} y={H - 6}
              textAnchor="middle" fontSize={11} fill="#808080">{v}s</text>
          ))}
          {round.impacts.map((impact, i) => (
            <circle
              key={i}
              cx={toX(impact.time)}
              cy={toY(impact.intensity)}
              r={6}
              fill={impact.isValid ? 'var(--accent)' : '#404040'}
              opacity={impact.isValid ? 0.9 : 0.6}
            />
          ))}
        </svg>
      )}
    </div>
  )
}

function RoundStats({ round }: { round: Round }): JSX.Element {
  const { stats } = round
  return (
    <div className="grid grid-cols-5 gap-2 mb-3">
      {[
        { label: 'Golpes', value: stats.totalImpacts },
        { label: 'Válidos', value: stats.validHits },
        { label: 'Power máx', value: stats.powerMax },
        { label: 'HPM prom.', value: stats.hpmAverage },
        { label: 'Duración', value: formatDuration(stats.duration) },
      ].map(({ label, value }) => (
        <div key={label} className="bg-bg-tertiary rounded-lg p-2 text-center border border-border">
          <p className="text-xs text-text-muted">{label}</p>
          <p className="text-lg font-bold text-text-primary">{value}</p>
        </div>
      ))}
    </div>
  )
}

export function SessionDetail({ training, onBack, onDelete }: SessionDetailProps): JSX.Element {
  const [selectedRound, setSelectedRound] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteTraining = useTrainingStore((s) => s.deleteTraining)

  const round = training.rounds[selectedRound]

  const handleConfirmDelete = () => {
    deleteTraining(training.id)
    onDelete(training.id)
    onBack()
  }

  const powerMax = Math.max(0, ...training.rounds.flatMap(r => r.impacts).map(i => Math.round(i.magnitude)))

  return (
    <div className="flex flex-col h-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <button onClick={onBack}
          className="text-sm text-text-muted hover:text-text-primary transition-colors">
          ← Volver
        </button>
        <div className="text-center">
          <p className="text-xs text-text-muted">{training.device.name}</p>
          <p className="text-sm font-semibold text-text-primary">{formatDate(training.createdAt)}</p>
        </div>
        <button onClick={() => setConfirmDelete(true)}
          className="text-xs text-text-muted hover:text-accent transition-colors border border-border hover:border-accent rounded px-2 py-1">
          Eliminar
        </button>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-4 gap-3 px-6 py-3 border-b border-border shrink-0">
        <div className="text-center">
          <p className="text-xs text-text-muted">Rounds</p>
          <p className="text-xl font-bold text-text-primary">{training.rounds.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Golpes</p>
          <p className="text-xl font-bold text-accent">{training.totalImpacts}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Power máx</p>
          <p className="text-xl font-bold text-secondary">{powerMax}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">HPM prom.</p>
          <p className="text-xl font-bold text-text-primary">{Math.round(training.hpmAverage)}</p>
        </div>
      </div>

      {/* Round tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-border shrink-0">
        {training.rounds.map((r, i) => (
          <button
            key={i}
            onClick={() => setSelectedRound(i)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              selectedRound === i
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            R{r.number}
          </button>
        ))}
      </div>

      {/* Round content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {round && (
          <>
            <RoundStats round={round} />
            <div className="bg-bg-secondary rounded-xl border border-border p-3">
              <RoundChart round={round} />
            </div>
          </>
        )}
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-bg-secondary rounded-xl border border-border p-6 max-w-sm mx-4">
            <p className="text-text-primary font-semibold mb-1">¿Eliminar esta sesión?</p>
            <p className="text-text-muted text-sm mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
