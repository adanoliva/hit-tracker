import { useState, useEffect, useRef } from 'react'
import { useDeviceStore } from '../../stores/deviceStore'
import { useSensorData } from '../../hooks/useSensorData'
import { mockSensorConnection, MOCK_DEVICE_ID } from '../../services/mockSensor'
import type { CalibrationProfile } from '../../types'

const DEFAULT_PROFILE: CalibrationProfile = {
  id: 'default-v1',
  name: 'Default',
  threshold: 15.0,
  sensitivity: 25.0,

  createdAt: 0
}

export function GamePage(): JSX.Element {
  const connected = useDeviceStore((s) => s.connected)
  const isMock = connected?.mac === MOCK_DEVICE_ID

  const { impacts, processReading, reset } = useSensorData(DEFAULT_PROFILE)
  const [bestHit, setBestHit] = useState(0)
  const [lastHit, setLastHit] = useState(0)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const active = !!connected

  useEffect(() => {
    if (!isMock || !active) return
    mockSensorConnection.connect(processReading)
    return () => mockSensorConnection.disconnect()
  }, [active, isMock, processReading])

  useEffect(() => {
    if (impacts.length === 0) return
    const last = impacts[impacts.length - 1]
    const mag = Math.round(last.magnitude)
    setLastHit(mag)
    if (mag > bestHit) {
      setBestHit(mag)
      setFlash(true)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(false), 500)
    }
  }, [impacts])

  const handleReset = () => {
    reset()
    setBestHit(0)
    setLastHit(0)
    setFlash(false)
  }

  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 bg-bg-primary">
        <span className="text-5xl">🥊</span>
        <p className="text-text-muted text-center text-sm">Conecta un dispositivo<br />para jugar</p>
      </div>
    )
  }

  return (
    <div className={`relative flex flex-col items-center justify-between h-full bg-bg-primary px-8 py-10 transition-all duration-100 ${flash ? 'bg-accent/10' : ''}`}>
      <p className="text-xs tracking-[0.3em] text-text-muted mt-4">MEJOR GOLPE</p>

      <div className="flex-1 flex items-center justify-center">
        <span className={`text-[10rem] font-extrabold font-mono leading-none transition-colors duration-200 ${flash ? 'text-accent' : 'text-text-primary'}`}>
          {bestHit}
        </span>
      </div>

      {lastHit > 0 && (
        <div className="flex flex-col items-center gap-1 mb-6">
          <span className="text-[0.65rem] tracking-[0.2em] text-text-muted">ÚLTIMO</span>
          <span className="text-3xl font-bold font-mono text-secondary">{lastHit}</span>
        </div>
      )}

      <button
        onClick={handleReset}
        className="w-full max-w-xs py-4 rounded-lg border border-border bg-bg-secondary text-text-muted text-sm tracking-widest font-semibold hover:border-accent hover:text-accent transition-colors"
      >
        RESET
      </button>
    </div>
  )
}
