# HIT TRACKER — Guía de Migración a React Native (Android)

## Objetivo

Portar la app de escritorio (Electron + React) a Android usando **React Native + Expo**, manteniendo la misma lógica de negocio, tipos y stores. La app debe funcionar bien en **móvil vertical** y en **tablet horizontal** (layout equivalente al escritorio).

---

## Stack objetivo

| Capa | Actual (Desktop) | Android |
|------|-----------------|---------|
| Runtime | Electron | React Native (Expo SDK 51+) |
| Lenguaje | TypeScript 5 | TypeScript 5 (sin cambios) |
| Estado | Zustand 4 | Zustand 4 (sin cambios) |
| Bluetooth | Web Bluetooth API (Electron IPC) | `react-native-ble-plx` |
| Persistencia | `fs` JSON via IPC | `expo-file-system` + `expo-secure-store` |
| Navegación | Estado React manual | React Navigation 6 (stack + tabs) |
| Gráficos | Recharts | `victory-native` o `react-native-gifted-charts` |
| Estilos | Tailwind CSS | StyleSheet / NativeWind |
| Iconos | SVG inline | `@expo/vector-icons` |

---

## Lo que se reutiliza sin cambios

Estos módulos son TypeScript puro y no tienen dependencias de Electron ni del DOM:

- `src/renderer/src/types/index.ts` — todos los tipos
- `src/renderer/src/services/calibration.ts` — lógica de cálculo
- `src/renderer/src/services/trainingService.ts` — lógica de sesiones/rondas
- `src/renderer/src/hooks/useSensorData.ts` — detección de golpes y clasificación
- `src/renderer/src/hooks/useTraining.ts` — orquestación de rondas
- `src/renderer/src/stores/trainingStore.ts` — estado global (Zustand)
- `src/renderer/src/stores/profileStore.ts` — estado global (Zustand)
- `src/renderer/src/stores/deviceStore.ts` — estado global (Zustand)

Mover estos ficheros a `src/core/` en el proyecto React Native y usarlos directamente.

---

## Lo que hay que reemplazar

### 1. Bluetooth

**Desktop**: `window.api` IPC → `select-bluetooth-device` de Electron.

**Android**: `react-native-ble-plx`. La API cambia pero el contrato del servicio (`BluetoothService`) se mantiene.

```typescript
// src/services/bluetooth.ts (nueva implementación)
import { BleManager, Device } from 'react-native-ble-plx'

const SERVICE_UUID = '...'   // mismo que el firmware ESP32
const CHAR_UUID    = '...'

const manager = new BleManager()

export const bluetoothService = {
  async scan(onDevice: (d: Device) => void) {
    manager.startDeviceScan(null, null, (err, device) => {
      if (device?.name?.includes('HitTracker')) onDevice(device)
    })
  },

  async connect(deviceId: string, onData: (reading: SensorReading) => void) {
    const device = await manager.connectToDevice(deviceId)
    await device.discoverAllServicesAndCharacteristics()
    device.monitorCharacteristicForService(SERVICE_UUID, CHAR_UUID, (err, char) => {
      if (char?.value) onData(parseReading(char.value))  // base64 → SensorReading
    })
  },

  disconnect(deviceId: string) {
    manager.cancelDeviceConnection(deviceId)
  }
}
```

Permisos necesarios en `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Y solicitud en runtime con `expo-permissions` o `react-native-permissions`.

---

### 2. Persistencia

**Desktop**: `window.api.saveTraining(t)` → IPC → `fs.writeFile`.

**Android**: `expo-file-system`.

```typescript
// src/services/storage.ts
import * as FileSystem from 'expo-file-system'

const BASE = FileSystem.documentDirectory + 'HitTracker/'

export const storage = {
  async saveTraining(training: Training) {
    await FileSystem.makeDirectoryAsync(BASE + 'trainings/', { intermediates: true })
    await FileSystem.writeAsStringAsync(
      BASE + `trainings/training_${training.id}.json`,
      JSON.stringify(training)
    )
  },

  async loadTrainings(): Promise<Training[]> {
    const dir = await FileSystem.readDirectoryAsync(BASE + 'trainings/').catch(() => [])
    const results = await Promise.all(
      dir.map(f => FileSystem.readAsStringAsync(BASE + 'trainings/' + f))
    )
    return results.map(r => JSON.parse(r))
  },

  async deleteTraining(id: string) {
    await FileSystem.deleteAsync(BASE + `trainings/training_${id}.json`, { idempotent: true })
  },

  async saveProfiles(profiles: CalibrationProfile[]) {
    await FileSystem.writeAsStringAsync(BASE + 'profiles.json', JSON.stringify(profiles))
  },

  async loadProfiles(): Promise<CalibrationProfile[]> {
    const raw = await FileSystem.readAsStringAsync(BASE + 'profiles.json').catch(() => '[]')
    return JSON.parse(raw)
  }
}
```

Los stores (Zustand) llaman a `storage.*` en vez de `window.api.*`. El resto de la lógica no cambia.

---

### 3. Gráficos

Recharts es web-only. Reemplazar con `victory-native`:

```typescript
// TrainingRound: LineChart con puntos de golpes
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis } from 'victory-native'

// El mapeo de datos es el mismo: { x: impact.time, y: impact.intensity }
// Los colores por tipo de golpe son los mismos
```

---

### 4. Estilos

Dos opciones:

- **NativeWind** (recomendado): mismo sistema de clases Tailwind, sintaxis idéntica a la versión desktop. Requiere configuración extra en `babel.config.js`.
- **StyleSheet**: más verboso pero sin dependencias adicionales.

Con NativeWind, la mayor parte de las clases CSS se reutilizan directamente. Lo que no existe en RN:
- `hover:` → eliminar (táctil no tiene hover)
- `transition-*` → usar `Animated` de RN o `react-native-reanimated`
- `cursor-pointer` → no aplica

---

## Layouts: móvil vs tablet

### Detección de layout

```typescript
import { useWindowDimensions } from 'react-native'

export function useLayout() {
  const { width, height } = useWindowDimensions()
  return {
    isTablet: width >= 768,
    isLandscape: width > height
  }
}
```

### Móvil (vertical) — navegación por tabs en la parte inferior

```
┌─────────────────────┐
│      Header         │
├─────────────────────┤
│                     │
│    Contenido        │
│    (scroll)         │
│                     │
├─────────────────────┤
│ Inicio │ Entrenar │ ··· │  ← Tab bar
└─────────────────────┘
```

Pantalla de entrenamiento en vertical: timer grande centrado, gráfico debajo, stats en fila compacta. Los controles (parar, pausa) fijos abajo.

### Tablet (horizontal) — layout de dos columnas, equivalente al escritorio

```
┌──────────┬──────────────────────────┐
│          │                          │
│ Sidebar  │    Contenido principal   │
│ (nav)    │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

La sidebar tiene el mismo contenido que el nav actual de la app desktop. El contenido principal es idéntico al escritorio.

### Implementación con React Navigation

```typescript
// Navegación adaptativa según dispositivo
export function RootNavigator() {
  const { isTablet, isLandscape } = useLayout()

  if (isTablet && isLandscape) {
    return <TabletLayout />   // Drawer permanente (sidebar visible)
  }
  return <MobileLayout />     // Bottom tabs
}
```

---

## Estructura de proyecto sugerida

```
hit-tracker-android/
├── app/                        # Expo Router (si se usa) o entry point
├── src/
│   ├── core/                   # Copiado de la versión desktop sin cambios
│   │   ├── types/index.ts
│   │   ├── services/calibration.ts
│   │   ├── services/trainingService.ts
│   │   ├── hooks/useSensorData.ts
│   │   ├── hooks/useTraining.ts
│   │   └── stores/
│   │
│   ├── services/               # Implementaciones nativas
│   │   ├── bluetooth.ts        # react-native-ble-plx
│   │   └── storage.ts          # expo-file-system
│   │
│   ├── hooks/
│   │   └── useLayout.ts        # detección móvil/tablet
│   │
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── Training/
│   │   ├── Devices/
│   │   └── Profiles/
│   │
│   └── navigation/
│       ├── MobileLayout.tsx    # Bottom tabs
│       └── TabletLayout.tsx    # Drawer lateral
│
├── assets/
│   └── logo.png
├── app.json
└── babel.config.js
```

---

## Dependencias principales

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "react-native": "0.74.x",
    "react-navigation/native": "^6.0.0",
    "@react-navigation/bottom-tabs": "^6.0.0",
    "@react-navigation/drawer": "^6.0.0",
    "react-native-ble-plx": "^3.1.0",
    "expo-file-system": "~17.0.0",
    "zustand": "^4.5.0",
    "nativewind": "^4.0.0",
    "victory-native": "^41.0.0",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0"
  }
}
```

---

## Consideraciones específicas de Android

- **Permisos BLE**: Android 12+ requiere `BLUETOOTH_SCAN` y `BLUETOOTH_CONNECT` (antes era solo `ACCESS_FINE_LOCATION`). Solicitar en runtime antes de escanear.
- **Background BLE**: Android mata conexiones BLE cuando la app va a background. Usar un `Foreground Service` si se necesita mantener la sesión activa con pantalla apagada.
- **Vibración en golpes**: Disponible con `expo-haptics` — útil como feedback táctil al detectar un impacto.
- **Mantener pantalla encendida**: Durante una sesión, usar `expo-keep-awake` para que la pantalla no se apague.
- **Audio (campana de rounds)**: `expo-av` para reproducir sonidos de inicio/fin de round.

```typescript
import * as KeepAwake from 'expo-keep-awake'
import * as Haptics from 'expo-haptics'

// Al iniciar sesión:
KeepAwake.activateKeepAwake()

// Al detectar golpe válido:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Al terminar sesión:
KeepAwake.deactivateKeepAwake()
```

---

## Orden de implementación sugerido

1. **Setup**: Crear proyecto Expo con TypeScript. Copiar `src/core/` desde la versión desktop.
2. **Storage**: Implementar `storage.ts` con `expo-file-system`. Adaptar los stores para que llamen a storage en vez de `window.api`.
3. **Navegación base**: Implementar `MobileLayout` (tabs) y `TabletLayout` (drawer). Verificar que el switch entre ambos funciona.
4. **BLE**: Implementar `bluetooth.ts` con `react-native-ble-plx`. Probar escaneo y conexión con el ESP32.
5. **Componentes**: Portar uno a uno los componentes, empezando por Dashboard (sin BLE, solo datos). Luego Profiles, luego Training.
6. **Gráficos**: Sustituir Recharts por victory-native en `TrainingRound`.
7. **Polish**: Haptics, KeepAwake, audio de campana, ajustes de layout por densidad de pantalla.
