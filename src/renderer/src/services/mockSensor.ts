import type { SensorReading } from '../types'

export const MOCK_DEVICE_ID = 'SIMULATOR'
export const MOCK_DEVICE_NAME = 'Simulador (local)'
const MOCK_URL = 'http://localhost:7331'
const MOCK_WS  = 'ws://localhost:7331'

export async function detectMockSensor(): Promise<boolean> {
  try {
    const res = await fetch(`${MOCK_URL}/health`, { signal: AbortSignal.timeout(500) })
    return res.ok
  } catch {
    return false
  }
}

class MockSensorConnection {
  private ws: WebSocket | null = null
  private onData: ((r: SensorReading) => void) | null = null

  connect(onReading: (r: SensorReading) => void): void {
    this.onData = onReading
    this.ws = new WebSocket(MOCK_WS)

    this.ws.onmessage = (e) => {
      try {
        const reading = JSON.parse(e.data) as SensorReading
        this.onData?.(reading)
      } catch {
        // ignore malformed frames
      }
    }

    this.ws.onerror = () => console.error('[mock] WebSocket error')
    this.ws.onclose = () => console.log('[mock] WebSocket cerrado')
  }

  disconnect(): void {
    this.ws?.close()
    this.ws = null
    this.onData = null
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const mockSensorConnection = new MockSensorConnection()
