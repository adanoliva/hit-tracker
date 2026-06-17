import { useState, useEffect, useCallback } from 'react'
import { useDeviceStore } from '../../stores/deviceStore'
import { detectMockSensor, MOCK_DEVICE_ID, MOCK_DEVICE_NAME } from '../../services/mockSensor'
import type { Device } from '../../types'
import type { BleDevice } from '../../env'

type ScanState = 'idle' | 'scanning' | 'error'

interface DevicesPageProps {
  onBack: () => void
}

export function DevicesPage({ onBack }: DevicesPageProps): JSX.Element {
  const { devices, connected, updateDevice, removeDevice, setConnected } = useDeviceStore()
  const addDevice = useDeviceStore((s) => s.addDevice)

  const [scanState, setScanState] = useState<ScanState>('idle')
  const [scanError, setScanError] = useState('')
  const [foundDevices, setFoundDevices] = useState<BleDevice[]>([])
  const [editingMac, setEditingMac] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Escucha dispositivos BLE encontrados desde main process
  useEffect(() => {
    const unsub = window.api.onBleDevicesUpdated((list) => {
      setFoundDevices((prev) => {
        // Mantiene el simulador si ya estaba en la lista
        const mock = prev.find((d) => d.deviceId === MOCK_DEVICE_ID)
        return mock ? [mock, ...list] : list
      })
    })
    return unsub
  }, [])

  const startScan = useCallback(async () => {
    setScanState('scanning')
    setScanError('')
    setFoundDevices([])

    // Comprueba si el simulador está corriendo antes de arrancar BLE
    const mockRunning = await detectMockSensor()
    if (mockRunning) {
      setFoundDevices([{ deviceId: MOCK_DEVICE_ID, deviceName: MOCK_DEVICE_NAME }])
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      })

      const newDevice: Device = {
        mac: device.id,
        name: device.name || 'Dispositivo BLE',
        createdAt: Date.now(),
        lastSeen: Date.now()
      }
      if (!devices.find((d) => d.mac === device.id)) {
        addDevice(newDevice)
      }

      setScanState('idle')
      setFoundDevices([])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('user')) {
        setScanState('idle')
      } else {
        setScanState('error')
        setScanError(msg)
      }
      setFoundDevices([])
    }
  }, [devices, addDevice])

  const selectFound = (ble: BleDevice) => {
    if (ble.deviceId === MOCK_DEVICE_ID) {
      // Añade el simulador directamente sin pasar por BLE
      window.api.cancelBleScan()
      const mockDevice: Device = {
        mac: MOCK_DEVICE_ID,
        name: MOCK_DEVICE_NAME,
        createdAt: Date.now(),
        lastSeen: Date.now()
      }
      if (!devices.find((d) => d.mac === MOCK_DEVICE_ID)) {
        addDevice(mockDevice)
      }
      setConnected(MOCK_DEVICE_ID)
      setScanState('idle')
      setFoundDevices([])
    } else {
      window.api.selectBleDevice(ble.deviceId)
    }
  }

  const cancelScan = () => {
    window.api.cancelBleScan()
    setScanState('idle')
    setFoundDevices([])
  }

  const handleRename = (mac: string) => {
    if (!editName.trim()) return
    updateDevice(mac, { name: editName.trim() })
    setEditingMac(null)
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-text-muted hover:text-text-primary transition-colors">←</button>
        <h1 className="text-xl font-bold text-text-primary">Dispositivos</h1>
      </div>

      {/* Dispositivos guardados */}
      <div className="space-y-2">
        {devices.length === 0 && (
          <p className="text-text-muted text-sm">Sin dispositivos registrados</p>
        )}
        {devices.map((d) => (
          <div
            key={d.mac}
            className={`bg-bg-secondary rounded-xl p-4 border transition-all ${
              connected?.mac === d.mac ? 'border-secondary' : 'border-border hover:border-accent/40'
            }`}
          >
            {editingMac === d.mac ? (
              <div className="flex gap-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-bg-tertiary border border-border rounded px-2 py-1 text-sm text-text-primary focus:border-secondary outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(d.mac)}
                />
                <button onClick={() => handleRename(d.mac)} className="text-sm text-secondary hover:text-secondary-hover">
                  Guardar
                </button>
                <button onClick={() => setEditingMac(null)} className="text-sm text-text-muted">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-text-primary">{d.name}</p>
                  {d.mac !== MOCK_DEVICE_ID && (
                    <p className="text-xs text-text-muted font-mono">{d.mac}</p>
                  )}
                  {connected?.mac === d.mac && (
                    <p className="text-xs text-secondary mt-1">● Activo</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {connected?.mac === d.mac ? (
                    <button
                      onClick={() => setConnected(null)}
                      className="text-xs text-accent border border-accent/40 px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                    >
                      Desconectar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConnected(d.mac)}
                      className="text-xs text-secondary border border-secondary/40 px-2 py-1 rounded hover:bg-secondary/10 transition-colors"
                    >
                      Usar
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingMac(d.mac); setEditName(d.name) }}
                    className="text-xs text-text-muted border border-border px-2 py-1 rounded hover:text-text-primary transition-colors"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={() => removeDevice(d.mac)}
                    className="text-xs text-text-muted border border-border px-2 py-1 rounded hover:text-accent hover:border-accent/40 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Panel de escaneo */}
      {scanState === 'idle' && (
        <button
          onClick={startScan}
          className="w-full border border-dashed border-border hover:border-accent/50 text-text-muted hover:text-text-primary py-3 rounded-xl text-sm transition-all"
        >
          + Buscar dispositivo Bluetooth
        </button>
      )}

      {scanState === 'scanning' && (
        <div className="bg-bg-secondary rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-secondary rounded-full animate-pulse" />
              <p className="text-sm text-text-primary font-medium">Buscando dispositivos...</p>
            </div>
            <button
              onClick={cancelScan}
              className="text-xs text-text-muted hover:text-accent transition-colors border border-border px-2 py-1 rounded"
            >
              Cancelar
            </button>
          </div>

          {foundDevices.length === 0 ? (
            <p className="text-xs text-text-muted">Asegúrate de que el Bluetooth está activado y el saco encendido</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-text-muted uppercase tracking-wider">
                {foundDevices.length} dispositivo{foundDevices.length !== 1 ? 's' : ''} encontrado{foundDevices.length !== 1 ? 's' : ''}
              </p>
              {foundDevices.map((ble) => (
                <button
                  key={ble.deviceId}
                  onClick={() => selectFound(ble)}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-all ${
                    ble.deviceId === MOCK_DEVICE_ID
                      ? 'bg-accent/10 border-accent/40 hover:border-accent'
                      : 'bg-bg-tertiary border-border hover:border-secondary/50'
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">
                    {ble.deviceName || 'Dispositivo sin nombre'}
                    {ble.deviceId === MOCK_DEVICE_ID && (
                      <span className="ml-2 text-xs text-accent">simulador</span>
                    )}
                  </p>
                  {ble.deviceId !== MOCK_DEVICE_ID && (
                    <p className="text-xs text-text-muted font-mono mt-0.5">{ble.deviceId}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {scanState === 'error' && (
        <div className="bg-bg-secondary rounded-xl border border-accent/40 p-4 space-y-3">
          <p className="text-sm text-accent font-medium">Error al escanear</p>
          <p className="text-xs text-text-muted">{scanError}</p>
          <button
            onClick={() => setScanState('idle')}
            className="text-xs text-text-secondary border border-border px-3 py-1.5 rounded hover:text-text-primary transition-colors"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
