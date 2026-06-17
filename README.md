# HIT TRACKER

Sistema integrado de captura y análisis de impactos en entrenamiento de boxeo.

**Tecnología**: Electron + React + TypeScript + ESP32 + MPU-6050

---

## 📋 Contenido del Proyecto

Este proyecto incluye documentación técnica completa y código base para desarrollar HIT TRACKER.

### Documentación

1. **ARQUITECTURA.md** - Visión general del sistema, diagrama de componentes, flujos de datos
2. **SENSOR-TECNICO.md** - Especificaciones hardware, esquema de conexión, firmware ESP32
3. **APP-TECNICO.md** - Arquitectura de la aplicación, servicios, hooks, componentes React

### Código

1. **hit-tracker-firmware.ino** - Firmware Arduino completo para ESP32
2. **types-index.ts** - Interfaces TypeScript principales
3. **services-base.ts** - Servicios de BLE, calibración y sesiones
4. **hooks-base.ts** - Hooks React para manejo de sensores y sesiones

---

## 🚀 Inicio Rápido

### Requisitos

**Hardware:**
- ESP32-32D
- Módulo GY-521 (MPU-6050)
- Cable USB para programación
- Cables jumper hembra-hembra

**Software:**
- Arduino IDE 2.0+
- Node.js 16+
- npm o yarn

### Instalación Hardware

1. Conectar GY-521 al ESP32:
   ```
   GY-521 SDA  → ESP32 GPIO 21
   GY-521 SCL  → ESP32 GPIO 22
   GY-521 VCC  → ESP32 3.3V
   GY-521 GND  → ESP32 GND
   ```

2. Cargar firmware:
   - Abrir `hit-tracker-firmware.ino` en Arduino IDE
   - Seleccionar: Board → ESP32 DevKit C
   - Upload Speed: 921600
   - Click "Upload"
   - Abrir Serial Monitor (115200 baud)

### Instalación App

1. Crear estructura de carpetas:
   ```bash
   mkdir hit-tracker
   cd hit-tracker
   ```

2. Copiar archivos:
   - Copiar `types-index.ts` → `src/types/index.ts`
   - Copiar `services-base.ts` → `src/services/index.ts`
   - Copiar `hooks-base.ts` → `src/hooks/index.ts`

3. Instalar dependencias:
   ```bash
   npm install electron react react-dom zustand recharts
   npm install --save-dev typescript vite electron-vite @types/react
   ```

4. Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```

---

## 📊 Estructura de Carpetas

```
hit-tracker/
├─ ARQUITECTURA.md                # Documentación general
├─ SENSOR-TECNICO.md              # Documentación del hardware
├─ APP-TECNICO.md                 # Documentación de la app
│
├─ hit-tracker-firmware.ino        # Firmware ESP32
│
├─ src/
│  ├─ types/
│  │  ├─ sensor.ts               # SensorReading, Impact
│  │  ├─ device.ts               # Device interface
│  │  ├─ profile.ts              # CalibrationProfile
│  │  ├─ session.ts              # TrainingSession
│  │  └─ index.ts                # Exportar todos
│  │
│  ├─ services/
│  │  ├─ bluetooth.ts            # BLE communication
│  │  ├─ calibration.ts          # Calibration logic
│  │  ├─ session.ts              # Session management
│  │  └─ index.ts                # Exportar todos
│  │
│  ├─ hooks/
│  │  ├─ useSensorData.ts        # Procesar datos sensor
│  │  ├─ useSession.ts           # Gestionar sesión
│  │  ├─ useCalibration.ts       # Gestionar calibración
│  │  └─ index.ts                # Exportar todos
│  │
│  ├─ stores/
│  │  ├─ deviceStore.ts          # Estado de dispositivos
│  │  ├─ profileStore.ts         # Estado de perfiles
│  │  ├─ sessionStore.ts         # Estado de sesiones
│  │  └─ index.ts                # Exportar todos
│  │
│  ├─ components/
│  │  ├─ Dashboard.tsx
│  │  ├─ Devices/
│  │  ├─ Profiles/
│  │  ├─ Session/
│  │  └─ Progress/
│  │
│  ├─ utils/
│  │  ├─ math.ts                 # Cálculos
│  │  ├─ storage.ts              # I/O archivos
│  │  └─ format.ts               # Formateo
│  │
│  ├─ App.tsx
│  └─ index.css
│
├─ public/
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

---

## 🔑 Conceptos Principales

### Power (Potencia)

Métrica de intensidad de golpe (0-100):
- Basada en magnitud de aceleración del sensor
- Se aplica threshold y sensitivity del perfil
- Un golpe es "válido" si > 80% del máximo detectado

### Valid Hit (Golpe Válido)

Golpe que supera el 80% de tu máximo poder actual.

Ejemplo:
```
Si tu poder máximo histórico es 92:
- Golpe de 90 intensidad → VÁLIDO ✓
- Golpe de 70 intensidad → Inválido ✗
```

### RPM (Revoluciones Por Minuto)

Golpes por minuto: métrica de velocidad/ritmo.

```
10 golpes en 2.5 minutos = 4 RPM
```

### Calibración

Proceso de ajustar threshold y sensitivity:
1. Usuario golpea ligero (5-10 veces)
2. Usuario golpea normal (5-10 veces)
3. Usuario golpea fuerte (5-10 veces)
4. App sugiere valores automáticos
5. Usuario puede ajustar manualmente

---

## 🎯 Casos de Uso

### Caso 1: Primera Sesión

```
1. Abrir app
2. Dashboard muestra "No hay dispositivos conectados"
3. Click "Conectar saco"
4. Seleccionar MAC del ESP32
5. Ingresar nombre: "Saco de entrenamiento"
6. Dashboard muestra perfil "Default" y saco conectado
7. Click "Nueva sesión"
8. Seleccionar duración: 5 minutos
9. Click "Iniciar" → cuenta atrás 10s
10. Campana suena → empezar a golpear
11. Gráfico muestra impactos en tiempo real
12. 5 minutos después → fin automático
13. Resultado guardado con timestamp
```

### Caso 2: Calibrar Nuevo Perfil

```
1. Click "Nuevos perfiles"
2. Ingresar nombre: "Golpe fuerte"
3. Se crea con valores Default
4. Click "Calibrar"
5. Pantalla: "Golpea ligero" → 8 golpes
6. Pantalla: "Golpea normal" → 8 golpes
7. Pantalla: "Golpea fuerte" → 8 golpes
8. App sugiere: Threshold=20.5, Sensitivity=18.0
9. Usuario ajusta sliders si quiere
10. Click "Guardar"
11. Perfil guardado y listo para usar
```

### Caso 3: Ver Progreso

```
1. Click "Progreso"
2. Ver gráfico: Power máximo en últimas sesiones (tendencia)
3. Ver tabla: últimas 5 sesiones con stats
4. Ver logros: "5 sesiones completadas", "PR 98"
5. Comparativa: "Este mes vs mes pasado: +27 power"
```

---

## 🛠️ Desarrollo

### Agregar Nuevo Hook

```typescript
// src/hooks/useMiLogica.ts

import { useState, useCallback } from 'react'

export function useMiLogica() {
  const [state, setState] = useState(null)
  
  const miFunction = useCallback(() => {
    // lógica
  }, [])
  
  return { state, miFunction }
}
```

### Agregar Nuevo Componente

```typescript
// src/components/MiComponente.tsx

import React from 'react'

export function MiComponente() {
  return (
    <div className="p-4">
      {/* contenido */}
    </div>
  )
}
```

### Agregar Nuevo Servicio

```typescript
// src/services/miServicio.ts

export class MiServicio {
  miMetodo() {
    // implementar
  }
}

export const miServicio = new MiServicio()
```

---

## 📱 Pantallas Principales

### Dashboard
- Estado de conexión
- Sesiones recientes
- Botón "Nueva sesión"
- Acceso a Perfiles y Dispositivos

### Sesión
- Timer (cuenta atrás)
- Gráfico en vivo (impactos)
- Estadísticas en tiempo real
- Controles (inicio/parada)

### Perfiles
- Lista de perfiles
- Crear nuevo
- Editar/Eliminar
- Calibrar

### Progreso
- Gráficos de tendencia
- Estadísticas mensuales
- Logros
- Comparativas

---

## 🔗 Dependencias Principales

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.0.0",
    "recharts": "^2.0.0",
    "electron": "^27.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

---

## 🐛 Troubleshooting

### ESP32 no se detecta
- Instalar driver CH340 o CP2102
- Verificar cable USB (algunos son solo carga)
- Reiniciar Arduino IDE

### App no conecta con sensor
- Verificar Bluetooth está encendido en PC
- Reiniciar ESP32 (botón RST)
- Verificar Serial Monitor para ver logs del sensor

### Datos erráticos
- Agregar capacitor 100µF entre VCC-GND del sensor
- Verificar que cables no tengan ruido de RF
- Reubicar antena BLE del PC

### Performance bajo
- Reducir frecuencia de notificaciones BLE
- Usar throttling en gráficos (recharts optimizado)
- Limitar número de sesiones cargadas

---

## 📝 Próximos Pasos

1. ✅ Documentación completa
2. ✅ Código base (tipos, servicios, hooks)
3. ⏳ Implementar componentes React
4. ⏳ Integrar BLE real con noble-mac
5. ⏳ Testing automático
6. ⏳ Build ejecutable
7. ⏳ Rhythm Mode v2
8. ⏳ Cloud sincronización

---

## 📄 Licencia

MIT - Libre para uso educativo y comercial.

---

## 📧 Contacto

Para preguntas o contribuciones, abrir issue en el repositorio.

---

**HIT TRACKER** - Monitoreo de entrenamiento de boxeo con IoT 🥊
