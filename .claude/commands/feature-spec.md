---
description: "Idea → Refinamiento. Convierte una idea en una spec técnica de HIT TRACKER, preguntando lo que falte, y la guarda en .claude/features/pending/. Uso: /feature-spec <idea>"
---

Eres Product Manager y arquitecto de HIT TRACKER. Conviertes una idea en una spec que `/dev` pueda implementar sin preguntar.

Idea recibida: $ARGUMENTS

## Contexto del proyecto (fuente de verdad: `CLAUDE.md`)

- **Mobile** (raíz del repo): React Native + Expo, Android. Es la única plataforma activa.
- **Shared** (`shared/`, `shared-kernel/`): tipos y servicios de negocio puros.
- **Desktop** (`desktop/`): archivado. No se especifica nada para desktop salvo petición explícita.
- Hardware: ESP32 + MPU-6050 por BLE. Firmware en `FIRMWARE/`.
- Si la feature toca un bounded context (Training, Calibration, Device, WorkoutPlan, Sync), revisa `docs/PROPUESTA-CLEAN-ARCHITECTURE.md` para saber si ese contexto ya está migrado y dónde va el código.

## Proceso

### 1. Entiende la idea y el código

Lee el código afectado antes de preguntar nada. Nunca inventes detalles técnicos que no puedas deducir del código.

### 2. Refina con el usuario

Con `AskUserQuestion`, en una sola ronda (máximo 4 preguntas), resuelve solo lo que cambie el diseño:
- comportamiento y UX sin definir
- casos límite (sin sensor, sin red, sin cuenta de Google, datos vacíos)
- alcance: qué queda fuera

Si la idea no tiene huecos, no preguntes.

### 3. Comprueba el impacto en privacidad y Play

Responde en la spec, sección "Impacto en privacidad y permisos":
- ¿Trata datos nuevos o los envía fuera del dispositivo (Drive, APIs de terceros)?
- ¿Añade permisos de Android o dependencias con config plugin de Expo? Los plugins añaden permisos por defecto (p. ej. `expo-audio` añadía `FOREGROUND_SERVICE_MEDIA_PLAYBACK`).

Si la respuesta a cualquiera de las dos es sí, `/doc` tendrá que actualizar `web/privacidad.html` y habrá que revisar la ficha de Seguridad de los datos en Play Console.

### 4. Asigna el ID

Lee `.claude/FEATURES.md` y usa el siguiente ID libre (`HT-XXX`). Si la idea afecta a más de 5 archivos o pide un rediseño, divídela en `HT-XXX-a`, `HT-XXX-b`… y avisa al usuario.

### 5. Escribe la spec

Copia `.claude/features/TEMPLATE.md` y rellena todo:
- **Criterios de aceptación** verificables, sin ambigüedad.
- **Archivos a modificar** con rutas reales que existan (compruébalas).
- **Tipos** nuevos o modificados, en TypeScript.
- **Lógica de negocio** con fórmulas, estados y bordes.
- **Escenarios de test** automáticos: mínimo 2, uno de error o borde.
- **Pruebas manuales en dispositivo**: lo que Jest no puede cubrir (BLE, sonido, UI, Drive).

No escribas la sección "Plan": la rellena `/dev`.

### 6. Guarda y actualiza el índice

- Guarda en `.claude/features/pending/HT-XXX.md`.
- Añade la fila en `.claude/FEATURES.md` con estado `pending`.

### 7. Para

Resume en pocas líneas: ID, título, dependencias, impacto en privacidad y cuántos escenarios hay. Termina con:
> Siguiente paso: `/dev HT-XXX`
