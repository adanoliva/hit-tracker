import { useState, useCallback, useRef } from 'react'
import type { SensorReading, Impact, CalibrationProfile } from '../types'
import { calibrationService } from '../services/calibration'

interface HPMStats {
  current: number
  average: number
  max: number
}

interface UseSensorDataReturn {
  impacts: Impact[]
  powerMax: number
  powerMaxMag: number
  hpmStats: HPMStats
  processReading: (reading: SensorReading) => Impact | null
  reset: () => void
}

const PEAK_COOLDOWN_MS = 200

export function useSensorData(profile: CalibrationProfile): UseSensorDataReturn {
  const [impacts, setImpacts] = useState<Impact[]>([])
  const [powerMax, setPowerMax] = useState(0)
  const [powerMaxMag, setPowerMaxMag] = useState(0)
  const [hpmStats, setHpmStats] = useState<HPMStats>({ current: 0, average: 0, max: 0 })

  const lastPeakTime   = useRef(0)
  const prevReading    = useRef<SensorReading | null>(null)
  const startTime      = useRef(Date.now())
  const powerMaxRef    = useRef(0)
  const powerMaxMagRef = useRef(0)

  const processReading = useCallback(
    (reading: SensorReading): Impact | null => {
      const prev = prevReading.current
      prevReading.current = reading

      if (!prev) return null

      const now       = reading.timestamp
      const isRising  = reading.magnitude > prev.magnitude
      const isPeak    =
        !isRising &&
        prev.magnitude > profile.threshold &&
        now - lastPeakTime.current > PEAK_COOLDOWN_MS

      if (!isPeak) return null

      lastPeakTime.current = now
      const intensity  = calibrationService.calculateIntensity(prev.magnitude, profile)

      const newPowerMax = Math.max(powerMaxRef.current, intensity)
      powerMaxRef.current = newPowerMax
      setPowerMax(newPowerMax)

      const newPowerMaxMag = Math.max(powerMaxMagRef.current, Math.round(prev.magnitude))
      powerMaxMagRef.current = newPowerMaxMag
      setPowerMaxMag(newPowerMaxMag)

      const impact: Impact = {
        time:      now,
        intensity,
        magnitude: prev.magnitude,
        duration:  0,
        isValid:   intensity >= newPowerMax * ((profile.validHitThreshold ?? 80) / 100)
      }

      setImpacts((prevImpacts) => {
        const updated = [...prevImpacts, impact]

        const elapsed    = (Date.now() - startTime.current) / 60000
        const avgHpm     = elapsed > 0 ? Math.round(updated.length / elapsed) : 0
        const recentHits = updated.filter((i) => now - i.time < 10000)
        const currentHpm = Math.round((recentHits.length / 10000) * 60000)

        setHpmStats((prev) => ({
          current: currentHpm,
          average: avgHpm,
          max: Math.max(prev.max, currentHpm)
        }))

        return updated
      })

      return impact
    },
    [profile]
  )

  const reset = useCallback(() => {
    setImpacts([])
    setPowerMax(0)
    setPowerMaxMag(0)
    setHpmStats({ current: 0, average: 0, max: 0 })
    lastPeakTime.current   = 0
    prevReading.current    = null
    startTime.current      = Date.now()
    powerMaxRef.current    = 0
    powerMaxMagRef.current = 0
  }, [])

  return { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset }
}
