import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Impact, PunchType } from '../../types'

interface TrainingRoundProps {
  roundNumber: number
  totalRounds: number
  timeRemaining: number
  impacts: Impact[]
  powerMax: number
  hpmStats: { current: number; average: number; max: number }
  onAbort: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const PUNCH_COLOR: Record<PunchType, string> = {
  'jab':        '#00d9ff',  // cyan  - derecha directa
  'cross':      '#ff4444',  // rojo  - izquierda directa
  'right-hook': '#ff9900',  // naranja - derecha gancho
  'left-hook':  '#cc44ff',  // púrpura - izquierda gancho
  'unknown':    '#555555'
}

const PUNCH_LABEL: Record<PunchType, string> = {
  'jab':        'Jab',
  'cross':      'Cross',
  'right-hook': 'Hook D',
  'left-hook':  'Hook I',
  'unknown':    '?'
}

function ImpactDot(props: any): JSX.Element {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return <g />
  const color  = PUNCH_COLOR[payload.punchType as PunchType] ?? '#555'
  const radius = payload.isValid ? 5 : 3

  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill={color} opacity={payload.isValid ? 0.9 : 0.4} />
      {payload.isValid && (
        <circle cx={cx} cy={cy} r={radius + 2} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
      )}
    </g>
  )
}

export function TrainingRound({
  roundNumber,
  totalRounds,
  timeRemaining,
  impacts,
  powerMax,
  hpmStats,
  onAbort
}: TrainingRoundProps): JSX.Element {
  const validHits = impacts.filter((i) => i.isValid).length

  const chartData = impacts.map((i) => ({
    time:      i.time,
    intensity: i.intensity,
    isValid:   i.isValid,
    punchType: i.punchType
  }))

  const xDomain: [number, number] = impacts.length > 0
    ? [impacts[0].time, Math.max(impacts[impacts.length - 1].time, impacts[0].time + 2000)]
    : [0, 2000]

  // Conteo por tipo para la leyenda
  const counts = impacts.reduce<Partial<Record<PunchType, number>>>((acc, i) => {
    acc[i.punchType] = (acc[i.punchType] ?? 0) + 1
    return acc
  }, {})

  const punchTypes: PunchType[] = ['jab', 'cross', 'right-hook', 'left-hook']

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-text-muted">Ronda</p>
          <p className="text-2xl font-bold text-text-primary">
            {roundNumber} <span className="text-text-muted text-lg">/ {totalRounds}</span>
          </p>
        </div>
        <p className={`text-5xl font-mono font-bold ${timeRemaining <= 10 ? 'text-accent' : 'text-text-primary'}`}>
          {formatTime(timeRemaining)}
        </p>
        <button
          onClick={onAbort}
          className="text-xs text-text-muted hover:text-accent transition-colors px-3 py-1 border border-border hover:border-accent rounded-lg"
        >
          Abortar
        </button>
      </div>

      {/* Leyenda de golpes */}
      <div className="flex gap-3 flex-wrap">
        {punchTypes.map((pt) => (
          <div key={pt} className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: PUNCH_COLOR[pt] }}
            />
            <span className="text-xs text-text-muted">
              {PUNCH_LABEL[pt]}
              {counts[pt] != null && (
                <span className="ml-1 font-bold" style={{ color: PUNCH_COLOR[pt] }}>
                  {counts[pt]}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 bg-bg-secondary rounded-xl border border-border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" type="number" domain={xDomain} hide />
            <YAxis
              dataKey="intensity"
              type="number"
              domain={[0, 105]}
              tick={{ fontSize: 10, fill: '#808080' }}
              width={28}
            />
            {powerMax > 0 && (
              <ReferenceLine
                y={powerMax * 0.8}
                stroke="#808080"
                strokeDasharray="4 4"
                opacity={0.4}
                label={{ value: '80%', position: 'insideTopRight', fontSize: 9, fill: '#808080' }}
              />
            )}
            <Line
              dataKey="intensity"
              type="monotone"
              stroke="#2a2a2a"
              strokeWidth={1}
              dot={<ImpactDot />}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="Golpes" value={impacts.length} />
        <Stat label="Válidos" value={validHits} color="text-accent" />
        <Stat label="Power máx" value={powerMax} color="text-accent" />
        <Stat label="HPM" value={hpmStats.current} color="text-secondary" />
      </div>
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
    <div className="bg-bg-secondary rounded-xl p-3 border border-border text-center">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
