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

// Dynamic cooldown: base + lastPeakMag * damping (all values in raw sensor units)
// Bottom sensor, jab soft ~665 raw: 200 + 665*0.3 = 400ms — covers 361ms rebound
const COOLDOWN_BASE_MS     = 200
const COOLDOWN_DAMPING     = 0.3

// Dynamic threshold: rises to peak*0.4 on hit, decays exponentially back to base.
// lambda is derived from the effective rebound (same value used for cooldown, see below)
// so that after `effectiveRebound` ms the floor has recovered 95% of the way to base —
// a single source of truth for "how long the bag keeps rebounding", instead of a second
// independent decay constant that could drift out of sync with the calibrated cooldown.
const FLOOR_RECOVERY_FRACTION = 0.05

export function useSensorData(profile: CalibrationProfile): UseSensorDataReturn {
  const [impacts, setImpacts] = useState<Impact[]>([])
  const [powerMax, setPowerMax] = useState(0)
  const [powerMaxMag, setPowerMaxMag] = useState(0)
  const [hpmStats, setHpmStats] = useState<HPMStats>({ current: 0, average: 0, max: 0 })

  const lastPeakTime    = useRef(0)
  const lastPeakMag     = useRef(0)
  const dynamicFloor    = useRef(0)
  const prevReading     = useRef<SensorReading | null>(null)
  const startTime       = useRef(Date.now())
  const powerMaxRef     = useRef(0)
  const powerMaxMagRef  = useRef(0)

  const processReading = useCallback(
    (reading: SensorReading): Impact | null => {
      const prev = prevReading.current
      prevReading.current = reading

      if (!prev && !reading.isPeak) return null

      const now      = reading.timestamp
      const deltaMs  = Math.max(1, now - (prev?.timestamp ?? now - 1))

      // V3: firmware already detected the hit — skip peak detection
      if (reading.isPeak) {
        const mag = reading.magnitude
        const base = profile.threshold * 10
        lastPeakTime.current  = now
        lastPeakMag.current   = mag
        dynamicFloor.current  = Math.max(base, mag * 0.4)
        prevReading.current   = reading

        const intensity = calibrationService.calculateIntensity(mag, profile)
        const newPowerMax = Math.max(powerMaxRef.current, intensity)
        powerMaxRef.current = newPowerMax
        setPowerMax(newPowerMax)
        const newPowerMaxMag = Math.max(powerMaxMagRef.current, Math.round(mag))
        powerMaxMagRef.current = newPowerMaxMag
        setPowerMaxMag(newPowerMaxMag)

        const impact: Impact = { time: now, intensity, magnitude: mag, duration: 0 }
        setImpacts((prev) => {
          const updated = [...prev, impact]
          const elapsed = (Date.now() - startTime.current) / 60000
          const avgHpm = elapsed > 0 ? Math.round(updated.length / elapsed) : 0
          const recentHits = updated.filter((i) => now - i.time < 10000)
          const currentHpm = Math.round((recentHits.length / 10000) * 60000)
          setHpmStats((s) => ({ current: currentHpm, average: avgHpm, max: Math.max(s.max, currentHpm) }))
          return updated
        })
        return impact
      }

      if (!prev) return null

      // Use raw magnitude throughout — calibration threshold is also in raw units
      const mag      = reading.magnitude
      const prevMag  = prev.magnitude
      const base     = profile.threshold * 10

      // profile.rebound is the personalized cooldown from calibration wizard
      // fallback: dynamic formula based on last peak raw magnitude
      const effectiveRebound = profile.rebound
        ?? (COOLDOWN_BASE_MS + lastPeakMag.current * COOLDOWN_DAMPING)

      // Exponential decay toward base: after effectiveRebound ms, 95% recovered
      const lambda = -Math.log(FLOOR_RECOVERY_FRACTION) / effectiveRebound
      dynamicFloor.current = base + (dynamicFloor.current - base) * Math.exp(-lambda * deltaMs)

      const isRising = mag > prevMag

      const cooldown = effectiveRebound

      const isPeak =
        !isRising &&
        prevMag > dynamicFloor.current &&
        now - lastPeakTime.current > cooldown

      if (!isPeak) return null

      dynamicFloor.current = Math.max(base, prevMag * 0.4)
      lastPeakTime.current = now
      lastPeakMag.current  = prevMag

      const intensity = calibrationService.calculateIntensity(prevMag, profile)

      const newPowerMax = Math.max(powerMaxRef.current, intensity)
      powerMaxRef.current = newPowerMax
      setPowerMax(newPowerMax)

      const newPowerMaxMag = Math.max(powerMaxMagRef.current, Math.round(prevMag))
      powerMaxMagRef.current = newPowerMaxMag
      setPowerMaxMag(newPowerMaxMag)

      const impact: Impact = {
        time:      now,
        intensity,
        magnitude: prevMag,
        duration:  0,
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
    lastPeakMag.current    = 0
    dynamicFloor.current   = 0
    prevReading.current    = null
    startTime.current      = Date.now()
    powerMaxRef.current    = 0
    powerMaxMagRef.current = 0
  }, [])

  return { impacts, powerMax, powerMaxMag, hpmStats, processReading, reset }
}
