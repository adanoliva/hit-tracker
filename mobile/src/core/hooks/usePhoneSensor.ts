import { useEffect, useRef } from 'react'
import { Accelerometer, Gyroscope } from 'expo-sensors'
import type { SensorReading, PhoneSensorPlacement } from '../types'

const SAMPLE_INTERVAL_MS = 20 // ~50Hz, mismo que el ESP32

/**
 * [solo mobile] Remapea los ejes del giroscopio según la posición del móvil
 * para que la clasificación jab/cross/hook funcione igual que con el ESP32.
 *
 * Frontal vertical: el móvil está parado frente al saco, mismo eje que el sensor.
 *   gz = yaw del saco → hook
 *
 * Horizontal encima: el móvil tumbado en la parte superior del saco.
 *   El yaw del saco pasa a ser gy del móvil (el eje Z del móvil apunta hacia arriba).
 *   gz_efectivo = gy
 */
function remapGz(raw: { gy: number; gz: number }, placement: PhoneSensorPlacement): number {
  return placement === 'top-horizontal' ? raw.gy : raw.gz
}

interface UsePhoneSensorOptions {
  placement: PhoneSensorPlacement
  active: boolean
  onReading: (reading: SensorReading) => void
}

export function usePhoneSensor({ placement, active, onReading }: UsePhoneSensorOptions) {
  const accelRef = useRef({ x: 0, y: 0, z: 0 })
  const gyroRef  = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (!active) return

    Accelerometer.setUpdateInterval(SAMPLE_INTERVAL_MS)
    Gyroscope.setUpdateInterval(SAMPLE_INTERVAL_MS)

    const accelSub = Accelerometer.addListener((data) => {
      accelRef.current = data
    })

    const gyroSub = Gyroscope.addListener((data) => {
      gyroRef.current = data

      // Emitir la lectura combinada en cada tick del giroscopio
      const a = accelRef.current
      const g = gyroRef.current

      // expo-sensors devuelve aceleración en g (1g ≈ 9.81 m/s²)
      // Multiplicar para tener unidades comparables con el ESP32 (m/s²)
      const ax = a.x * 9.81
      const ay = a.y * 9.81
      const az = a.z * 9.81

      // expo-sensors devuelve giroscopio en rad/s → convertir a °/s
      const gx = g.x * (180 / Math.PI)
      const gy = g.y * (180 / Math.PI)
      const gz = remapGz(
        { gy: g.y * (180 / Math.PI), gz: g.z * (180 / Math.PI) },
        placement
      )

      const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)

      onReading({
        timestamp: Date.now(),
        ax, ay, az,
        gx, gy, gz,
        magnitude
      })
    })

    return () => {
      accelSub.remove()
      gyroSub.remove()
    }
  }, [active, placement, onReading])
}
