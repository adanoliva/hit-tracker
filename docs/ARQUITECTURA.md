# HIT TRACKER - Arquitectura General

## Visión General

HIT TRACKER es una aplicación de escritorio (Electron + React + TypeScript) que monitora, analiza y registra sesiones de entrenamiento de boxeo en tiempo real. El sistema se compone de:

- **Hardware**: ESP32 + GY-521 (acelerómetro + giroscopio)
- **Firmware**: Arduino/C++ para lectura de sensores y transmisión BLE
- **App Desktop**: Electron + React para análisis, visualización y persistencia

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                      USUARIO                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        v                v                v
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Saco    │      │ Control │      │ Monitor │
   │ (Sensor)│      │  (App)  │      │ (App)   │
   └────┬────┘      └────┬────┘      └────┬────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    [Bluetooth BLE]
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        v                v                v
   ┌──────────────────────────────────────────────┐
   │          ELECTRON APP (Main Process)         │
   │  ┌────────────────────────────────────────┐  │
   │  │      IPC + File System (preload.ts)    │  │
   │  └────────────────────────────────────────┘  │
   └──────────────────────────────────────────────┘
        │
        ├─────────────────────┬──────────────────┐
        │                     │                  │
        v                     v                  v
   ┌─────────────┐      ┌─────────────┐   ┌──────────────┐
   │   Services  │      │    Stores   │   │  React UI    │
   │  (BLE, IPC) │      │  (Zustand)  │   │ (Components) │
   └─────────────┘      └─────────────┘   └──────────────┘
        │                     │                  │
        └─────────────────────┼──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    v                   v
            ┌──────────────┐    ┌──────────────┐
            │   Hooks      │    │   Utils      │
            │              │    │              │
            └──────────────┘    └──────────────┘
                    │                   │
                    └─────────────┬─────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
                    v                            v
            ┌──────────────────┐        ┌──────────────────┐
            │  JSON Storage    │        │  Session Store   │
            │  (~/.config/app) │        │  (localStorage)  │
            └──────────────────┘        └──────────────────┘
```

---

## Componentes Principales

### 1. Hardware (ESP32 + GY-521)

**Responsabilidad**: Captura datos del sensor y transmite via Bluetooth.

```
GY-521 (MPU-6050)
    │
    ├─ Acelerómetro 3D (ax, ay, az)
    ├─ Giroscopio 3D (gx, gy, gz)
    └─ Temperatura
         │
         └─→ ESP32 (I2C)
              │
              ├─ Calcula magnitud
              ├─ Detecta movimiento
              └─ Transmite via BLE (GATT)
                   │
                   └─→ PC (Bluetooth)
```

**Flujo de datos**:
```
Sensor → ESP32 → Magnitud = sqrt(ax² + ay² + az²)
           ↓
     Si magnitud > umbral
           ↓
     Envía via BLE (timestamp + ax, ay, az, gx, gy, gz)
```

### 2. Servicios Bluetooth (App)

**Responsabilidad**: Conexión, lectura de datos, sincronización.

```typescript
BLE Service (bluethooth.ts)
├─ connectToDevice(mac)
├─ startListening()
├─ onSensorData(callback)
├─ disconnect()
└─ getConnectedDevices()
```

### 3. Hooks de Lógica

**Responsabilidad**: Procesamiento de datos, detección de golpes, cálculos.

```typescript
useSensorData()
├─ Recibe stream de datos brutos
├─ Detecta picos (golpes)
├─ Calcula intensidad (0-100)
└─ Emite eventos

useSession()
├─ Gestiona inicio/parada sesión
├─ Almacena impacts
├─ Calcula estadísticas
└─ Persiste resultados

useCalibration()
├─ Carga perfiles
├─ Aplica threshold + sensitivity
└─ Permite editar
```

### 4. Stores (Persistencia)

**Responsabilidad**: Estado global y persistencia de datos.

```typescript
CalibrationStore
├─ profiles: Profile[]
├─ addProfile()
├─ updateProfile()
└─ deleteProfile()

DeviceStore
├─ devices: Device[]
├─ addDevice()
├─ updateDeviceName()
└─ removeDevice()

SessionStore
├─ sessions: TrainingSession[]
├─ saveSession()
├─ loadSessions()
└─ deleteSession()
```

### 5. UI Components

**Responsabilidad**: Presentación y interacción del usuario.

```
App
├─ Dashboard
│  ├─ ConnectionStatus
│  ├─ RecentSessions
│  └─ QuickActions
│
├─ Devices
│  ├─ DeviceList
│  └─ AddDevice
│
├─ Profiles
│  ├─ ProfileList
│  ├─ CreateProfile
│  └─ CalibrateModal
│
├─ Session
│  ├─ SessionTimer
│  ├─ ImpactChart
│  ├─ Stats
│  └─ Controls
│
└─ Progress
   ├─ EvolutionChart
   ├─ PowerTrend
   ├─ RPMAnalysis
   └─ Achievements
```

---

## Flujo de Datos

### Flujo 1: Sesión de Entrenamiento

```
Usuario: "Iniciar sesión"
    ↓
App: Selecciona saco + perfil
    ↓
BLE: Conecta con ESP32
    ↓
ESP32: Inicia lectura sensores
    ↓
Cuenta atrás 10s (sonido "beep")
    ↓
INICIO: Sonido campana
    ↓
Loop (durante 3-5-10 min):
  ├─ ESP32 → Lee GY-521 (100Hz)
  ├─ Calcula magnitud
  ├─ Si magnitud > umbral → envía datos BLE
  ├─ App recibe: {timestamp, ax, ay, az, gx, gy, gz}
  ├─ Hook useSensorData() procesa
  ├─ Detecta pico (golpe) si magnitude > threshold
  ├─ Calcula intensidad (0-100) con sensitivity
  ├─ Si intensidad > 80% power_max → es "valid hit"
  ├─ Calcula RPM (golpes/minuto)
  └─ Actualiza gráfico en tiempo real
    ↓
Tiempo agotado (sonido "ding ding")
    ↓
Sesión termina automáticamente
    ↓
Hook useSession() calcula estadísticas finales
    ↓
SessionStore: Guarda sesión (JSON + snapshots)
    ↓
UI: Muestra resultados
```

### Flujo 2: Calibración

```
Usuario: "Crear nuevo perfil"
    ↓
App: Genera perfil con valores Default
    ↓
Usuario: "Calibrar este perfil"
    ↓
Pantalla de calibración:
  ├─ Paso 1: Golpes ligeros (5-10)
  │  └─ Guarda muestras + magnitudes
  ├─ Paso 2: Golpes normales (5-10)
  │  └─ Guarda muestras + magnitudes
  ├─ Paso 3: Golpes fuertes (5-10)
  │  └─ Guarda muestras + magnitudes
  ├─ Análisis automático:
  │  ├─ Calcula promedio de cada rango
  │  ├─ Sugiere threshold
  │  └─ Sugiere sensitivity
  └─ Usuario ajusta con sliders si quiere
    ↓
CalibrationStore: Guarda perfil actualizado
```

### Flujo 3: Análisis de Progreso

```
Usuario: Abre "Progreso"
    ↓
App: Carga todas las sesiones (filter por período)
    ↓
Calcula métricas:
  ├─ Power máximo histórico (mes, semana, todo)
  ├─ Valid hit rate evolución
  ├─ RPM promedio tendencia
  ├─ Consistencia (varianza)
  ├─ Logros desbloqueados
  └─ Comparativas temporales
    ↓
UI: Renderiza gráficos (recharts)
```

---

## Persistencia de Datos

```
~/.config/HitTracker/
├─ devices.json
│  └─ [{mac, name, createdAt, lastSeen}, ...]
│
├─ profiles.json
│  └─ [{id, name, threshold, sensitivity, calibrationData}, ...]
│
├─ sessions/
│  ├─ session_2025-01-16_14h32m47s.json
│  ├─ session_2025-01-16_15h18m22s.json
│  └─ ... (cada sesión es un archivo independiente)
│
└─ app-config.json
   └─ {theme, defaultProfile, defaultDevice, ...}
```

---

## Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Desktop | Electron | 27+ |
| Frontend | React | 18+ |
| Lenguaje | TypeScript | 5+ |
| Estado | Zustand | 4+ |
| BLE | noble-mac/noble | latest |
| Gráficos | Recharts | 2+ |
| Estilos | Tailwind CSS | 3+ |
| Firmware | Arduino IDE | 2+ |
| Microcontrolador | ESP32 | - |
| Sensor | MPU-6050 (GY-521) | - |

---

## Consideraciones de Diseño

### Separación de Responsabilidades
- **Hardware**: Solo captura y transmite
- **App (Services)**: Conexión y comunicación
- **App (Hooks)**: Lógica de negocio
- **App (Stores)**: Estado global
- **App (UI)**: Presentación

### Performance
- Lectura sensores a 100Hz (10ms)
- Procesamiento asincrónico de datos
- Actualización UI optimizada (throttling)
- Almacenamiento local (sin cloud)

### Escalabilidad Futura
- Multi-saco: agregar devices
- Rhythm Mode: agregar nueva modalidad
- Exportar/sincronizar: agregar cloud opcional

---

## Próximas Fases

**V1 (MVP):**
- Hardware funcional
- App con sesiones básicas
- Calibración manual
- Progreso simple

**V2:**
- Rhythm Mode
- Multi-saco avanzado
- Exportar video
- Integración redes sociales

**V3:**
- Cloud sincronización
- Apps móviles
- Competiciones online
