# HIT TRACKER - Documento Técnico de la Aplicación

## Descripción General

HIT TRACKER es una aplicación de escritorio desarrollada con Electron, React y TypeScript. Monitorea sesiones de entrenamiento de boxeo en tiempo real, analiza impactos y genera estadísticas de progreso.

---

## Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Desktop Framework | Electron | 27+ |
| Frontend Framework | React | 18+ |
| Lenguaje | TypeScript | 5+ |
| State Management | Zustand | 4+ |
| BLE Communication | noble-mac / noble | latest |
| Charts | Recharts | 2+ |
| Styling | Tailwind CSS | 3+ |
| Build Tool | Vite | 5+ |
| Package Manager | npm | 9+ |

---

## Estructura de Carpetas

```
hit-tracker/
├─ public/
│  └─ images/
│
├─ src/
│  ├─ main/                    # Main process (Electron)
│  │  ├─ main.ts              # Entry point
│  │  ├─ preload.ts           # IPC bridges
│  │  └─ ipc-handlers.ts       # File system handlers
│  │
│  ├─ services/               # Lógica de negocio
│  │  ├─ bluetooth.ts         # BLE connection
│  │  ├─ calibration.ts       # Profile management
│  │  └─ session.ts           # Session logic
│  │
│  ├─ stores/                 # Estado global (Zustand)
│  │  ├─ deviceStore.ts       # Dispositivos conectados
│  │  ├─ profileStore.ts      # Perfiles de calibración
│  │  └─ sessionStore.ts      # Historial de sesiones
│  │
│  ├─ hooks/                  # Custom React hooks
│  │  ├─ useSensorData.ts     # Procesa datos del sensor
│  │  ├─ useSession.ts        # Gestiona sesión
│  │  └─ useCalibration.ts    # Gestiona calibración
│  │
│  ├─ components/             # Componentes React
│  │  ├─ Dashboard.tsx
│  │  ├─ Devices/
│  │  │  ├─ DeviceList.tsx
│  │  │  └─ AddDevice.tsx
│  │  ├─ Profiles/
│  │  │  ├─ ProfileList.tsx
│  │  │  ├─ CreateProfile.tsx
│  │  │  └─ CalibrateModal.tsx
│  │  ├─ Session/
│  │  │  ├─ SessionTimer.tsx
│  │  │  ├─ ImpactChart.tsx
│  │  │  ├─ SessionStats.tsx
│  │  │  └─ Controls.tsx
│  │  └─ Progress/
│  │     ├─ PowerTrend.tsx
│  │     ├─ RPMAnalysis.tsx
│  │     └─ Achievements.tsx
│  │
│  ├─ types/                  # TypeScript definitions
│  │  ├─ sensor.ts            # SensorReading, Impact, etc
│  │  ├─ device.ts            # Device interface
│  │  ├─ profile.ts           # CalibrationProfile interface
│  │  └─ session.ts           # TrainingSession interface
│  │
│  ├─ utils/                  # Utilidades
│  │  ├─ math.ts              # Cálculos (magnitude, RPM, etc)
│  │  ├─ storage.ts           # Lectura/escritura archivos
│  │  └─ format.ts            # Formateo de datos
│  │
│  ├─ App.tsx                 # Componente raíz
│  └─ index.css               # Estilos globales
│
├─ electron.vite.config.ts    # Configuración Vite + Electron
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## Interfaces Principales (Types)

### SensorReading

```typescript
// src/types/sensor.ts

interface SensorReading {
  timestamp: number      // ms desde inicio
  ax: number            // aceleración X (m/s²)
  ay: number            // aceleración Y (m/s²)
  az: number            // aceleración Z (m/s²)
  gx: number            // rotación X (°/s)
  gy: number            // rotación Y (°/s)
  gz: number            // rotación Z (°/s)
  magnitude: number     // sqrt(ax² + ay² + az²)
}

interface Impact {
  time: number          // timestamp del impacto
  intensity: number     // 0-100 escalado
  magnitude: number     // raw magnitude
  duration: number      // ms que duró el pico
  isValid: boolean      // > 80% del power máximo
}
```

### Device

```typescript
interface Device {
  mac: string           // Dirección MAC (único)
  name: string          // Nombre custom
  createdAt: number     // timestamp creación
  lastSeen: number      // última conexión
  isConnected: boolean
}
```

### CalibrationProfile

```typescript
interface CalibrationProfile {
  id: string            // UUID único
  name: string          // Nombre del perfil
  threshold: number     // Umbral de detección
  sensitivity: number   // Sensibilidad de intensidad
  calibrationData: {
    calibratedAt: number
    samples: {
      light: number[]     // magnitudes golpes ligeros
      normal: number[]    // magnitudes golpes normales
      heavy: number[]     // magnitudes golpes fuertes
    }
  }
}
```

### TrainingSession

```typescript
interface TrainingSession {
  id: string            // session_YYYY-MM-DD_HHhmmsss
  createdAt: number
  
  device: {
    mac: string
    name: string        // snapshot del nombre
  }
  
  profile: CalibrationProfile  // snapshot completo
  
  impacts: Impact[]
  rawReadings: SensorReading[]
  
  duration: number      // ms
  totalImpacts: number
  validHits: number     // impactos > 80%
  powerMax: number      // máximo power detectado
  rpmAverage: number    // golpes/minuto promedio
  notes?: string
}
```

---

## Servicios (Business Logic)

### BluetoothService (src/services/bluetooth.ts)

```typescript
class BluetoothService {
  // Conexión
  async connectToDevice(mac: string): Promise<boolean>
  async disconnectDevice(): Promise<void>
  async getAvailableDevices(): Promise<Device[]>
  
  // Escucha
  onSensorData(callback: (reading: SensorReading) => void): void
  onConnectionChange(callback: (connected: boolean) => void): void
  
  // Estados
  isConnected(): boolean
  getCurrentDevice(): Device | null
}
```

### CalibrationService (src/services/calibration.ts)

```typescript
class CalibrationService {
  // Perfiles
  createProfile(name: string): CalibrationProfile
  getProfile(id: string): CalibrationProfile | null
  updateProfile(id: string, updates: Partial<CalibrationProfile>): void
  deleteProfile(id: string): void
  
  // Calibración
  analyzeCalibrationSamples(
    light: number[],
    normal: number[],
    heavy: number[]
  ): {
    suggestedThreshold: number
    suggestedSensitivity: number
  }
  
  // Aplicar calibración
  calculateIntensity(magnitude: number, profile: CalibrationProfile): number
  isValidHit(intensity: number, powerMax: number): boolean
}
```

### SessionService (src/services/session.ts)

```typescript
class SessionService {
  // Sesión actual
  startSession(
    device: Device,
    profile: CalibrationProfile,
    duration: number  // segundos
  ): void
  
  stopSession(): TrainingSession
  
  // Procesamiento
  onImpactDetected(impact: Impact): void
  calculateStats(): SessionStats
  
  // Persistencia
  async saveSession(session: TrainingSession): Promise<void>
  async loadSessions(): Promise<TrainingSession[]>
  async deleteSession(id: string): Promise<void>
}
```

---

## Hooks Personalizados

### useSensorData (src/hooks/useSensorData.ts)

```typescript
function useSensorData(profile: CalibrationProfile) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [impacts, setImpacts] = useState<Impact[]>([])
  const [powerMax, setPowerMax] = useState(0)
  const [rpmStats, setRpmStats] = useState({
    current: 0,
    average: 0,
    max: 0
  })
  
  // Procesa datos raw del sensor
  const processReading = useCallback((reading: SensorReading) => {
    // Detectar picos (golpes)
    const isPeak = detectPeak(reading.magnitude)
    
    if (isPeak) {
      const intensity = calculateIntensity(reading.magnitude, profile)
      const isValid = intensity > powerMax * 0.8
      
      setImpacts(prev => [...prev, {
        time: reading.timestamp,
        intensity,
        magnitude: reading.magnitude,
        duration: calculateDuration(),
        isValid
      }])
      
      setPowerMax(Math.max(powerMax, reading.magnitude))
    }
    
    // Calcular RPM (golpes por minuto)
    updateRPMStats()
    
    setReadings(prev => [...prev, reading])
  }, [profile, powerMax])
  
  return { readings, impacts, powerMax, rpmStats, processReading }
}
```

### useSession (src/hooks/useSession.ts)

```typescript
function useSession(
  device: Device,
  profile: CalibrationProfile,
  durationSeconds: number
) {
  const [isRecording, setIsRecording] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds)
  const [impacts, setImpacts] = useState<Impact[]>([])
  
  const startSession = useCallback(() => {
    setIsRecording(true)
    playSound('start')  // campana
    
    // Timer cuenta atrás
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])
  
  const endSession = useCallback(() => {
    setIsRecording(false)
    playSound('end')    // ding ding
    
    // Calcular estadísticas finales
    const stats = calculateSessionStats(impacts)
    
    return new TrainingSession({
      device,
      profile,
      impacts,
      ...stats
    })
  }, [impacts, device, profile])
  
  return { isRecording, timeRemaining, impacts, startSession, endSession }
}
```

### useCalibration (src/hooks/useCalibration.ts)

```typescript
function useCalibration() {
  const [currentProfile, setCurrentProfile] = useState<CalibrationProfile | null>()
  const [samples, setSamples] = useState({
    light: [],
    normal: [],
    heavy: []
  })
  const [suggestions, setSuggestions] = useState({
    threshold: 0,
    sensitivity: 0
  })
  
  const capturePhase = useCallback((phase: 'light' | 'normal' | 'heavy') => {
    // Captura 5-10 golpes del tipo seleccionado
    // Guarda magnitudes
    return ({ light, normal, heavy }) => {
      const suggested = CalibrationService.analyzeCalibrationSamples(
        light, normal, heavy
      )
      setSuggestions(suggested)
    }
  }, [])
  
  const saveProfile = useCallback((customName?: string) => {
    const profile = {
      ...currentProfile,
      threshold: suggestions.threshold,
      sensitivity: suggestions.sensitivity,
      name: customName || currentProfile.name
    }
    
    profileStore.updateProfile(profile)
    return profile
  }, [currentProfile, suggestions])
  
  return { currentProfile, samples, suggestions, capturePhase, saveProfile }
}
```

---

## Stores (Estado Global - Zustand)

### deviceStore (src/stores/deviceStore.ts)

```typescript
export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  connected: null,
  
  addDevice: (device: Device) =>
    set(state => ({
      devices: [...state.devices, device]
    })),
  
  updateDeviceName: (mac: string, name: string) =>
    set(state => ({
      devices: state.devices.map(d =>
        d.mac === mac ? { ...d, name } : d
      )
    })),
  
  setConnected: (mac: string) =>
    set(state => ({
      connected: state.devices.find(d => d.mac === mac) || null
    })),
  
  removeDevice: (mac: string) =>
    set(state => ({
      devices: state.devices.filter(d => d.mac !== mac)
    }))
}))
```

### profileStore (src/stores/profileStore.ts)

```typescript
export const useProfileStore = create<ProfileState>((set) => ({
  profiles: [DEFAULT_PROFILE],
  
  addProfile: (profile: CalibrationProfile) =>
    set(state => ({
      profiles: [...state.profiles, profile]
    })),
  
  updateProfile: (id: string, updates: Partial<CalibrationProfile>) =>
    set(state => ({
      profiles: state.profiles.map(p =>
        p.id === id ? { ...p, ...updates } : p
      )
    })),
  
  deleteProfile: (id: string) =>
    set(state => ({
      profiles: state.profiles.filter(p => p.id !== id)
    }))
}))
```

### sessionStore (src/stores/sessionStore.ts)

```typescript
export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  
  addSession: (session: TrainingSession) =>
    set(state => ({
      sessions: [...state.sessions, session]
    })),
  
  loadSessions: async () => {
    const sessions = await window.api.loadSessions()
    set({ sessions })
  },
  
  deleteSession: (id: string) =>
    set(state => ({
      sessions: state.sessions.filter(s => s.id !== id)
    }))
}))
```

---

## Flujo de Sesión (Pseudocódigo)

```typescript
// Dashboard → "Nueva sesión"
// ↓
// Selecciona saco + perfil
// ↓

function TrainingSession() {
  const { device } = useDeviceStore()
  const { profile } = useProfileStore()
  const { isRecording, timeRemaining, impacts, startSession, endSession } 
    = useSession(device, profile, 300)  // 5 minutos
  
  const { readings, powerMax, rpmStats, processReading } 
    = useSensorData(profile)
  
  // Conectar servicio BLE
  useEffect(() => {
    const bluetoothService = new BluetoothService()
    bluetoothService.onSensorData(processReading)
    return () => bluetoothService.disconnect()
  }, [processReading])
  
  return (
    <div>
      {/* Pantalla de preparación: cuenta atrás 10s */}
      <SessionTimer 
        isRecording={isRecording}
        timeRemaining={timeRemaining}
      />
      
      {/* Gráfico en vivo */}
      <ImpactChart impacts={impacts} powerMax={powerMax} />
      
      {/* Estadísticas en tiempo real */}
      <SessionStats 
        totalImpacts={impacts.length}
        validHits={impacts.filter(i => i.isValid).length}
        powerMax={powerMax}
        rpmStats={rpmStats}
      />
      
      {/* Controles */}
      <button onClick={startSession}>▶ Iniciar</button>
      <button onClick={endSession}>⏹ Detener</button>
      
      {/* Cuando termina: mostrar resultados */}
      {!isRecording && <SessionResults impacts={impacts} />}
    </div>
  )
}
```

---

## Componentes Principales

### SessionTimer

```typescript
// Cuenta atrás + visual
// Estados:
// 1. "Preparación" (10s antes de empezar)
// 2. "En curso" (gráfico en vivo)
// 3. "Finalizado" (auto-termina)
```

### ImpactChart

```typescript
// Recharts ScatterChart
// X: Tiempo
// Y: Intensidad (0-100)
// Golpes válidos: color azul
// Golpes inválidos: color gris
```

### SessionStats

```typescript
// Display en tiempo real:
// - Total de golpes
// - Golpes válidos (> 80%)
// - Power máximo
// - RPM actual/promedio/máximo
// - Consistencia
```

### ProgressAnalytics

```typescript
// Gráficos de tendencia:
// - Power máximo histórico
// - Valid hit rate
// - RPM promedio
// - Logros/badges
```

---

## Persistencia de Datos

### Estructura de Archivos

```
~/.config/HitTracker/
├─ devices.json
│  [{
│    "mac": "AA:BB:CC:DD:EE:FF",
│    "name": "Saco de entrenamiento",
│    "createdAt": 1705416767000,
│    "lastSeen": 1705420000000
│  }]
│
├─ profiles.json
│  [{
│    "id": "default-v1",
│    "name": "Default",
│    "threshold": 15.0,
│    "sensitivity": 25.0,
│    "calibrationData": {...}
│  }]
│
├─ sessions/
│  ├─ session_2025-01-16_14h32m47s.json
│  └─ ... (cada sesión)
│
└─ app-config.json
   {
     "theme": "dark",
     "defaultProfile": "default-v1",
     "defaultDevice": "AA:BB:CC:DD:EE:FF"
   }
```

### IPC Handlers (Main Process)

```typescript
// src/main/ipc-handlers.ts

ipcMain.handle('save-session', async (event, session: TrainingSession) => {
  const path = getSessionPath(session.id)
  await fs.writeFile(path, JSON.stringify(session, null, 2))
  return true
})

ipcMain.handle('load-sessions', async () => {
  const dir = getSessionsDir()
  const files = await fs.readdir(dir)
  return Promise.all(
    files.map(f => fs.readFile(path.join(dir, f), 'utf8'))
  ).then(files => files.map(f => JSON.parse(f)))
})

ipcMain.handle('update-device', async (event, device: Device) => {
  const devices = JSON.parse(
    await fs.readFile(getDevicesPath(), 'utf8')
  )
  const updated = devices.map(d => d.mac === device.mac ? device : d)
  await fs.writeFile(getDevicesPath(), JSON.stringify(updated, null, 2))
  return true
})
```

---

## Build y Deployment

### package.json Scripts

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "pack": "electron-builder --publish never",
    "release": "electron-builder --publish always"
  }
}
```

### Distribución

- **Windows**: .exe installer
- **macOS**: .dmg + .zip
- **Linux**: .AppImage + .deb

---

## Próximas Características (v2)

- [ ] Rhythm Mode (golpes al ritmo)
- [ ] Multi-saco (canales en gráfico)
- [ ] Exportar video
- [ ] Integración Twitter/Instagram
- [ ] Cloud sync
- [ ] App móvil companion
