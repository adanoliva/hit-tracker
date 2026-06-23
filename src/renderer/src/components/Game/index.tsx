import { useState, useEffect, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import { Dumbbell } from 'lucide-react'
import { useDeviceStore } from '../../stores/deviceStore'
import { useSensorData } from '../../hooks/useSensorData'
import { useGameStore, minScoreForTop3 } from '../../stores/gameStore'
import type { CalibrationProfile } from '../../types'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 12.0,
  sensitivity: 25.0,
  validHitThreshold: 80,
  createdAt: 0
}

export function GamePage(): JSX.Element {
  const connected = useDeviceStore((s) => s.connected)
  const { impacts, processReading, reset } = useSensorData(DEFAULT_PROFILE)
  const { topThree, phase, lastScore, pendingScore, startGame, cancelGame, registerHit, submitInitials, resetToIdle, loadScores } = useGameStore()
  const [initials, setInitials] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const hitRegistered = useRef(false)

  useEffect(() => { loadScores() }, [])

  useEffect(() => {
    if (!connected) return
    let unlisten: (() => void) | null = null
    listen<{ ax: number; ay: number; az: number }>('ble-sensor-data', (e) => {
      const { ax, ay, az } = e.payload
      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
      processReading({ ax, ay, az, gx: 0, gy: 0, gz: 0, magnitude, timestamp: Date.now() })
    }).then((fn) => { unlisten = fn })
    return () => { unlisten?.() }
  }, [connected, processReading])

  useEffect(() => {
    if (phase !== 'waiting') { hitRegistered.current = false; return }
  }, [phase])

  useEffect(() => {
    if (phase === 'waiting' && impacts.length > 0 && !hitRegistered.current) {
      hitRegistered.current = true
      const last = impacts[impacts.length - 1]
      registerHit(last.magnitude)
      reset()
    }
  }, [impacts, phase])

  useEffect(() => {
    if (phase === 'new-record') {
      setInitials('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [phase])

  const handleStart = () => { reset(); startGame() }

  const handleSubmit = async () => {
    if (initials.length === 0) return
    await submitInitials(initials)
    setInitials('')
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-bg-primary">
        <Dumbbell size={48} className="text-text-muted" />
        <p className="text-text-muted text-center text-sm">Conecta un dispositivo<br />para jugar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-between h-full bg-bg-primary px-8 py-10">
      {/* TOP 3 */}
      <div className="w-full max-w-xs">
        <p className="text-[0.65rem] tracking-[0.3em] text-text-muted text-center mb-3">TOP 3</p>
        <div className="flex flex-col gap-2">
          {topThree.map((entry, i) => (
            <div key={i} className="flex items-center justify-between bg-bg-secondary border border-border rounded-lg px-4 py-2">
              <span className="text-text-muted font-mono text-sm">{i + 1}.</span>
              {entry ? (
                <>
                  <span className="font-mono font-bold text-text-primary tracking-widest">{entry.initials}</span>
                  <span className="font-mono font-bold text-secondary text-lg">{entry.score}</span>
                </>
              ) : (
                <>
                  <span className="font-mono text-text-muted tracking-widest">---</span>
                  <span className="font-mono text-text-muted">---</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Center area */}
      <div className="flex-1 flex items-center justify-center w-full">
        {phase === 'idle' && (
          <button
            onClick={handleStart}
            className="px-12 py-5 rounded-xl bg-accent text-white text-xl font-extrabold tracking-widest hover:bg-accent/90 transition-colors"
          >
            EMPEZAR
          </button>
        )}

        {phase === 'waiting' && (
          <div className="flex flex-col items-center gap-6">
            <p
              className="text-5xl font-extrabold text-accent animate-pulse"
              style={{ animation: 'pulse 0.8s ease-in-out infinite' }}
            >
              ¡GOLPEA!
            </p>
            <button
              onClick={cancelGame}
              className="text-text-muted text-sm tracking-widest border border-border rounded-lg px-6 py-2 hover:border-accent hover:text-accent transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {phase === 'new-record' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <p className="text-[0.65rem] tracking-[0.3em] text-yellow-400">¡NUEVO RÉCORD!</p>
            <span className="text-7xl font-extrabold font-mono text-yellow-400">{pendingScore}</span>
            <p className="text-text-muted text-xs tracking-widest">INTRODUCE TUS INICIALES</p>
            <input
              ref={inputRef}
              value={initials}
              onChange={e => setInitials(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4))}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              maxLength={4}
              className="w-full text-center text-3xl font-mono font-bold tracking-widest bg-bg-secondary border border-border rounded-lg py-3 text-text-primary focus:border-yellow-400 outline-none"
              placeholder="AAA"
            />
            <button
              onClick={handleSubmit}
              disabled={initials.length === 0}
              className="w-full py-3 rounded-lg bg-yellow-400 text-bg-primary font-extrabold tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
            >
              CONFIRMAR
            </button>
          </div>
        )}

        {phase === 'loser' && (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <p className="text-[0.65rem] tracking-[0.3em] text-accent">LOSER</p>
            <span className="text-7xl font-extrabold font-mono text-accent">{lastScore}</span>
            <p className="text-text-muted text-xs text-center">
              Necesitabas al menos <span className="text-text-primary font-bold">{minScoreForTop3(topThree)}</span> para entrar
            </p>
            <button
              onClick={resetToIdle}
              className="w-full py-3 rounded-lg border border-border text-text-muted text-sm tracking-widest font-semibold hover:border-accent hover:text-accent transition-colors"
            >
              VOLVER
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
