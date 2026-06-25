import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import type { Impact } from '../../types'

interface TrainingRoundProps {
  roundNumber: number
  totalRounds: number
  timeRemaining: number
  timeElapsed: number
  isFreeMode: boolean
  impacts: Impact[]
  powerMax: number
  powerMaxMag: number
  userPowerRef: number
  hpmStats: { current: number; average: number; max: number }
  onAbort: () => void
  onFinish: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const HIT_COLOR = '#c0c0c0'

function ImpactDot(props: any): JSX.Element {
  const { cx, cy } = props
  if (cx == null || cy == null) return <g />
  return <circle cx={cx} cy={cy} r={4} fill={HIT_COLOR} opacity={0.85} />
}

export function TrainingRound({
  roundNumber, totalRounds, timeRemaining, timeElapsed, isFreeMode,
  impacts, powerMax, powerMaxMag, userPowerRef, hpmStats, onAbort, onFinish
}: TrainingRoundProps): JSX.Element {
  const chartData = impacts.map((i) => ({
    time:  i.time,
    value: userPowerRef > 0 ? Math.round((i.magnitude / userPowerRef) * 100) : i.intensity,
  }))

  const maxChartValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 100
  const yDomain: [number, number] = [0, Math.max(105, maxChartValue + 5)]

  const xDomain: [number, number] = impacts.length > 0
    ? [impacts[0].time, Math.max(impacts[impacts.length - 1].time, impacts[0].time + 2000)]
    : [0, 2000]

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
        <p className={`text-5xl font-mono font-bold ${!isFreeMode && timeRemaining <= 10 ? 'text-accent' : 'text-text-primary'}`}>
          {isFreeMode ? formatTime(timeElapsed) : formatTime(timeRemaining)}
        </p>
        <div className="flex flex-col gap-1.5">
          {isFreeMode && (
            <button
              onClick={onFinish}
              className="text-xs text-secondary font-bold hover:text-secondary/80 transition-colors px-3 py-1 border border-secondary hover:border-secondary/80 rounded-lg"
            >
              Finalizar
            </button>
          )}
          <button
            onClick={onAbort}
            className="text-xs text-text-muted hover:text-accent transition-colors px-3 py-1 border border-border hover:border-accent rounded-lg"
          >
            Abortar
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 bg-bg-secondary rounded-xl border border-border p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" type="number" domain={xDomain} hide />
            <YAxis
              dataKey="value"
              type="number"
              domain={yDomain}
              tick={{ fontSize: 10, fill: '#808080' }}
              width={28}
            />
            <Line
              dataKey="value"
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
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Golpes" value={impacts.length} />
        <Stat label="Power máx" value={powerMaxMag} color="text-accent" />
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
