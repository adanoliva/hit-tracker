import { useEffect, useRef } from 'react'
import { connectBleDevice } from '../../services/bleConnection'
import type { SensorReading } from '../types'

// Redirects incoming BLE readings to onReading when active.
// Reconnects if needed (e.g. app navigated away and back).
export function useBleReading(options: {
  deviceId: string | null
  active: boolean
  onReading: (r: SensorReading) => void
}) {
  const { deviceId, active, onReading } = options
  const onReadingRef = useRef(onReading)
  onReadingRef.current = onReading

  useEffect(() => {
    if (!deviceId || !active) return
    let cancelled = false
    connectBleDevice(deviceId, (r) => {
      if (!cancelled) onReadingRef.current(r)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [deviceId, active])
}
