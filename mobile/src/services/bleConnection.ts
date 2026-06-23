import { getBleManager } from './ble'
import type { SensorReading } from '../core/types'

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
const CHAR_UUID    = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'

type ReadingCallback = (r: SensorReading) => void

let _device: any = null
let _subscription: any = null

function parseReading(base64: string): SensorReading | null {
  try {
    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    if (raw.length < 16) return null
    const view = new DataView(raw.buffer)
    const ts = view.getUint32(0, true)
    const ax = view.getFloat32(4, true)
    const ay = view.getFloat32(8, true)
    const az = view.getFloat32(12, true)
    const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
    return { ax, ay, az, gx: 0, gy: 0, gz: 0, magnitude, timestamp: ts }
  } catch {
    return null
  }
}

export async function connectBleDevice(deviceId: string, onReading: ReadingCallback): Promise<void> {
  await disconnectBleDevice()

  const ble = getBleManager()
  if (!ble) throw new Error('BLE no disponible')

  _device = await ble.connectToDevice(deviceId)
  await _device.discoverAllServicesAndCharacteristics()

  _subscription = _device.monitorCharacteristicForService(
    SERVICE_UUID,
    CHAR_UUID,
    (_error: any, characteristic: any) => {
      if (!characteristic?.value) return
      const reading = parseReading(characteristic.value)
      if (reading) onReading(reading)
    }
  )
}

export async function disconnectBleDevice(): Promise<void> {
  _subscription?.remove()
  _subscription = null
  try { await _device?.cancelConnection() } catch {}
  _device = null
}
