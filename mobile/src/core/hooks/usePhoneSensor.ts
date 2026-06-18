import { useEffect, useRef } from 'react'
import { accelerometer, gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors'
import type { SensorReading, PhoneSensorPlacement } from '../types'

const SAMPLE_INTERVAL_MS = 20 // ~50Hz, mismo que el ESP32

interface UsePhoneSensorOptions {
  placement: PhoneSensorPlacement
  active: boolean
  onReading: (reading: SensorReading) => void
}

export function usePhoneSensor({ placement, active, onReading }: UsePhoneSensorOptions) {
  const gyroRef = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (!active) return

    setUpdateIntervalForType(SensorTypes.accelerometer, SAMPLE_INTERVAL_MS)
    setUpdateIntervalForType(SensorTypes.gyroscope, SAMPLE_INTERVAL_MS)

    const gyroSub = gyroscope.subscribe({ next: ({ x, y, z }) => { gyroRef.current = { x, y, z } }, error: () => {} })

    const accelSub = accelerometer.subscribe(({ x: ax, y: ay, z: az }) => {
      const g = gyroRef.current
      const gx = g.x * (180 / Math.PI)
      const gy = g.y * (180 / Math.PI)
      const gz = g.z * (180 / Math.PI)
      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
onReading({ timestamp: Date.now(), ax, ay, az, gx, gy, gz, magnitude })
    })

    return () => {
      accelSub.unsubscribe()
      gyroSub.unsubscribe()
    }
  }, [active, placement, onReading])
}
