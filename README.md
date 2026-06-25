# HIT TRACKER 🥊

> Monitoreo de entrenamiento de boxeo en tiempo real. Mide la potencia, el ritmo y la fatiga de cada golpe — ronda a ronda.

## ¿Qué es?

HIT TRACKER conecta un sensor inercial (ESP32 + MPU-6050) montado en el saco de boxeo con una app móvil en tiempo real. Cada golpe queda registrado con su **potencia**, **validez** y **timestamp** — agrupados por rondas, con descansos cronometrados.

No requiere cámara, ni visión artificial, ni suscripción. Solo hardware de 15€ y los datos son tuyos.

---

## Plataforma

**React Native + Expo** — Android (móvil y tablet)

| | |
|---|---|
| **Sensor** | ESP32 vía Bluetooth BLE **o** el propio móvil |
| **Modo "Todo en 1"** | El móvil actúa como sensor sin ESP32 |
| **Persistencia** | JSON local (`documentDirectory`) |

---

## Hardware

```
┌──────────────┐    I2C    ┌─────────────┐    BLE     ┌──────────┐
│ GY-521       ├──────────▶│    ESP32    ├───────────▶│  App     │
│ MPU-6050     │           │  DevKit C   │            │          │
│ (accel + gyro│           │             │            │ Android  │
│  3 ejes c/u) │           │  50 Hz      │            │ / Tablet │
└──────────────┘           └─────────────┘            └──────────┘
```

**Conexión del sensor:**

| GY-521 | ESP32 |
|--------|-------|
| SDA    | GPIO 21 |
| SCL    | GPIO 22 |
| VCC    | 3.3V |
| GND    | GND |

---

## Inicio Rápido

### 1. Firmware ESP32

```
Arduino IDE 2 → Board: ESP32 DevKit C → Upload Speed: 921600
```

Abre el `.ino` del directorio `FIRMWARE/`, sube al ESP32 y verifica en el Serial Monitor (115200 baud) que imprime lecturas del sensor.

### 2. App

```bash
npm install
npm run android     # o: expo start → escáner QR con Expo Go
```

Requisitos: Android 8+ con Bluetooth o sin él (modo "Todo en 1").

---

## Cómo funciona

### Detección de golpes

El sensor mide aceleración en 3 ejes a ~50Hz. Cuando la magnitud supera el umbral del perfil de calibración y comienza a descender, se registra un **impacto**:

```
magnitude = √(ax² + ay² + az²)

Si magnitude > threshold  →  detecta pico
intensity = clamp(0-100, (magnitude - threshold) × sensitivity)
isValid   = intensity ≥ powerMax × (validHitThreshold / 100)  ← configurable por perfil (default 80%)
```

### Estructura de un entrenamiento

```
Training
└── rounds: Round[]
    ├── Round 1 { impacts[], stats: RoundStats }
    ├── Round 2 { impacts[], stats: RoundStats }
    └── Round N ...

RoundStats
├── totalImpacts / validHits / validHitRate
├── powerMax / hpmAverage / hpmMax
├── powerTrend[]     ← intensidad de cada golpe en orden
└── isFatigued       ← 2ª mitad < 1ª mitad × 0.85
```

### Fases de la sesión

```
idle ──▶ preparing (10s) ──▶ round ──▶ resting ──▶ round ──▶ ... ──▶ finished
                  beep×10     campana               campana               ding ding
```

El modo **libre** (`roundDuration = 0`) deja el timer subiendo; el usuario termina la ronda manualmente.

### Calibración

El perfil de calibración ajusta dos parámetros:

- **threshold**: a partir de qué magnitud se considera un golpe
- **sensitivity**: cómo se escala la magnitud a intensidad 0-100

La calibración guiada pide golpes ligeros → normales → fuertes y sugiere valores automáticamente.

---

## Estructura del Proyecto

```
hit-tracker/
│
├─ shared/                    ← Tipos y lógica de negocio
│  ├─ types/index.ts          Todos los tipos del dominio
│  └─ services/
│     ├─ calibration.ts       calibrationService
│     └─ training.ts          trainingService
│
├─ src/                       ← App React Native
│  ├─ core/                   hooks · stores · types (re-exports @shared)
│  ├─ services/               audio (expo-audio) · ble · storage (expo-fs)
│  └─ components/             Dashboard · Devices · Profiles · Training · Game
│
├─ App.tsx                    Punto de entrada
├─ metro.config.js            Resuelve @shared desde ./shared
│
├─ FIRMWARE/                  Firmware Arduino (ESP32)
│
└─ docs/
   ├─ ARQUITECTURA.md         Diagrama de componentes y flujo de datos
   ├─ DOCUMENTO_TECNICO.md    Referencia completa de tipos, hooks, stores
   ├─ ROADMAP.md              Estado actual y próximas features
   └─ SENSOR-TECNICO-V*.md    Versiones del hardware ESP32
```

---

## Conceptos Clave

### HPM — Golpes Por Minuto

Métrica de velocidad/cadencia. Se calcula en dos ventanas:
- **HPM actual**: golpes en los últimos 10 segundos × 6
- **HPM promedio**: total de golpes / minutos transcurridos

### Valid Hit — Golpe Válido

Un golpe es válido si su intensidad supera el umbral configurado en el perfil (por defecto 80%) del máximo detectado en la sesión. Filtra golpes débiles o involuntarios y refleja el esfuerzo real.

### Fatiga de ronda

`isFatigued = true` cuando la intensidad promedio de la segunda mitad de la ronda es inferior al 85% de la primera mitad. Indicador de caída de rendimiento intra-ronda.

---

## Stack Técnico

| Capa | |
|---|---|
| Framework | Expo SDK 56 + React Native 0.85 + TypeScript 6 |
| Estado | Zustand 5 |
| BLE | react-native-ble-plx 3 |
| Sensor nativo | react-native-sensors 7 |
| Audio | expo-audio 56 |
| Gráficos | react-native-svg 15 |
| Estilos | StyleSheet (RN) |
| Build | EAS Build |

---

## Troubleshooting

**ESP32 no aparece en el móvil**
- Verificar que Bluetooth está activado
- Reiniciar el ESP32 (botón RST)
- Abrir Serial Monitor para confirmar que el firmware está corriendo

**La app no detecta el sensor BLE**
- Verificar permisos de Bluetooth en Android (Ajustes → Aplicaciones → HitTracker)
- Reiniciar el ESP32

**Golpes erráticos o falsos positivos**
- Aumentar el `threshold` en el perfil de calibración
- Añadir un condensador de 100µF entre VCC y GND del GY-521 para filtrar ruido

**`@shared` no resuelve**
- Verificar que `metro.config.js` incluye `watchFolders` apuntando a `./shared`
- Reiniciar Metro con `--reset-cache`: `expo start --clear`

---

## Documentación

| Documento | Contenido |
|---|---|
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) | Diagrama completo, flujo de datos, modelo de datos |
| [`docs/DOCUMENTO_TECNICO.md`](docs/DOCUMENTO_TECNICO.md) | Tipos, servicios, hooks, stores, IPC API |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Estado actual, features en progreso, backlog |
| [`docs/SENSOR-TECNICO-V1.md`](docs/SENSOR-TECNICO-V1.md) | Hardware V1: breadboard + USB |
| [`docs/SENSOR-TECNICO-V2.md`](docs/SENSOR-TECNICO-V2.md) | Hardware V2: LiPo + botón on/off |
| [`docs/SENSOR-TECNICO-V3.md`](docs/SENSOR-TECNICO-V3.md) | Hardware V3: micro SD, sesión autónoma |

---

## Distribución oficial

El repositorio oficial del proyecto es **[github.com/adanoliva/hit-tracker](https://github.com/adanoliva/hit-tracker)**.

Las distribuciones obtenidas fuera de este repositorio (forks, re-empaquetados, instaladores de terceros) **no están verificadas ni respaldadas** por los autores originales. Pueden contener modificaciones o código adicional. Antes de instalar cualquier build, verifica la fiabilidad de la fuente.

## Aviso legal

Este software se distribuye **sin garantía de ningún tipo**, expresa o implícita. Los autores no se responsabilizan de daños derivados de su uso. Consulta el texto completo de la licencia para más detalles.

## Licencia

GPL v3 — software libre; cualquier derivado debe distribuirse bajo la misma licencia.
