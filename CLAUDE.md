# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

HIT TRACKER es una app de escritorio (Electron + React + TypeScript) que monitorea sesiones de entrenamiento de boxeo en tiempo real. El hardware consiste en un ESP32 + GY-521 (MPU-6050) que transmite datos de acelerómetro/giroscopio via Bluetooth BLE a la app.

**Estado actual**: Fase de documentación y código base. La app aún no está implementada — los archivos en la raíz son plantillas/contexto para construirla.

## Comandos

```bash
npm run dev       # Desarrollo (electron-vite dev)
npm run build     # Build completo
npm run pack      # Genera ejecutable sin publicar
npm run release   # Build + publica
```

Firmware ESP32: Arduino IDE 2.0+, board "ESP32 DevKit C", upload speed 921600, serial monitor 115200 baud.

## Arquitectura

### Proceso Electron (Main ↔ Renderer)

La comunicación entre main process y React UI va por IPC. El preload expone `window.api` con handlers para file system (guardar/cargar sesiones, dispositivos, perfiles). **No usar `fs` directamente desde React** — todo pasa por `window.api`.

### Capas de la app

```
BLE (noble) → BluetoothService → useSensorData() → useTraining() → UI
```

- **Services** (`src/services/`): Lógica de negocio pura, sin estado React. `BluetoothService`, `CalibrationService`, `trainingService` (singleton).
- **Hooks** (`src/hooks/`): Puente entre servicios y UI. `useSensorData` procesa el stream raw, detecta picos y calcula intensidad. `useTraining` orquesta el flujo completo de rondas.
- **Stores** (`src/stores/`): Estado global con Zustand. `deviceStore`, `profileStore`, `trainingStore` (renombrado de `sessionStore` en v2).

### Modelo de datos principal (v2 con rondas)

El sistema evolucionó de `TrainingSession` (bloque continuo) a `Training { rounds: Round[] }`. Los archivos de contexto en la raíz describen ambos modelos:

- `types-index.ts` → base types (v1)
- `types-training.ts` → tipos de rondas (v2, usar estos)
- `services-training.ts` → `trainingService` con soporte de rondas
- `hooks-training.ts` → `useTraining()` hook
- `components-training.tsx` → componentes de UI de entrenamiento

### Detección de golpes

```
SensorReading.magnitude = sqrt(ax² + ay² + az²)
Si magnitude > CalibrationProfile.threshold → detecta pico → Impact
Impact.intensity = escalado 0-100 con sensitivity del perfil
Impact.isValid = intensity > powerMax * 0.8
```

### Persistencia

Archivos JSON en `~/.config/HitTracker/`:
- `devices.json`, `profiles.json`, `app-config.json`
- `trainings/training_*.json` (un archivo por entrenamiento)
- `music/` y `combos.json` (para modos v2)

## Roadmap

**V1 (MVP)**: Training con rondas, calibración, progreso.  
**V2**: Rhythm Mode (golpear al ritmo de música, BPM detection) y Combos Mode (secuencias de golpes predefinidas con validación de timing e intensidad).

Ver `INTEGRATION-GUIDE.md` para integrar el sistema de rondas en la app, y `TODO-V2-FEATURES.md` para la arquitectura de Rhythm y Combos Mode.
