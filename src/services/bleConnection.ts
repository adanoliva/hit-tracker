import { getBleManager } from './ble'
import type { SensorReading } from '../core/types'

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b'
const CHAR_UUID    = 'beb5483e-36e1-4688-b7f5-ea07361b26a8'
const VERSION_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a9'
const CONFIG_UUID  = 'beb5483e-36e1-4688-b7f5-ea07361b26aa'

type ReadingCallback = (r: SensorReading) => void

let _device: any = null
let _subscription: any = null
let _sensorVersion = 1

function parseV1(raw: Uint8Array): SensorReading | null {
  if (raw.length < 16) return null
  const view = new DataView(raw.buffer)
  const ts = view.getUint32(0, true)
  const ax = view.getFloat32(4, true)
  const ay = view.getFloat32(8, true)
  const az = view.getFloat32(12, true)
  const magnitude = Math.sqrt(ax * ax + ay * ay + az * az)
  return { ax, ay, az, gx: 0, gy: 0, gz: 0, magnitude, timestamp: ts }
}

function parseV2(raw: Uint8Array): SensorReading | null {
  if (raw.length < 16) return null
  const view = new DataView(raw.buffer)
  const ts = view.getUint32(0, true)
  const ax = view.getInt16(4, true)
  const ay = view.getInt16(6, true)
  const az = view.getInt16(8, true)
  const gx = view.getInt16(10, true)
  const gy = view.getInt16(12, true)
  const gz = view.getInt16(14, true)
  const magnitude = Math.round(Math.sqrt(ax * ax + ay * ay + az * az))
  return { ax, ay, az, gx, gy, gz, magnitude, timestamp: ts }
}

function parseV3(raw: Uint8Array): SensorReading | null {
  if (raw.length < 6) return null
  const view = new DataView(raw.buffer)
  const ts        = view.getUint32(0, true)
  const magnitude = view.getUint16(4, true)
  return { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0, magnitude, timestamp: ts, isPeak: true }
}

function parseReading(base64: string): SensorReading | null {
  try {
    const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    if (_sensorVersion === 3) return parseV3(raw)
    return _sensorVersion === 2 ? parseV2(raw) : parseV1(raw)
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

  // Read sensor version (default 1 if characteristic absent)
  try {
    const verChar = await _device.readCharacteristicForService(SERVICE_UUID, VERSION_UUID)
    if (verChar?.value) {
      const bytes = Uint8Array.from(atob(verChar.value), (c) => c.charCodeAt(0))
      _sensorVersion = bytes[0] ?? 1
    }
  } catch {
    _sensorVersion = 1
  }

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

export function getSensorVersion(): number {
  return _sensorVersion
}

// threshold: profile.threshold (0-100) — firmware expects raw units (threshold * 10)
// rebound:   cooldown in ms
export async function sendProfileConfig(threshold: number, rebound: number): Promise<void> {
  if (!_device) throw new Error('No device connected')
  const buf = new ArrayBuffer(4)
  const view = new DataView(buf)
  view.setUint16(0, threshold * 10, true)
  view.setUint16(2, rebound, true)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  await _device.writeCharacteristicWithResponseForService(SERVICE_UUID, CONFIG_UUID, b64)
}

export async function disconnectBleDevice(): Promise<void> {
  _subscription?.remove()
  _subscription = null
  try { await _device?.cancelConnection() } catch {}
  _device = null
  _sensorVersion = 1
}
