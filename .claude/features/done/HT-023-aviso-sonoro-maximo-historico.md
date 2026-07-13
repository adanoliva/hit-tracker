# Feature HT-023: Aviso sonoro al superar el máximo histórico

## Overview

Reproducir un sonido (`audioService.beep()`) en tiempo real cuando un golpe válido supera el `powerMax` histórico del usuario (media de las últimas 5 sesiones del perfil activo). Feedback inmediato sin depender de mirar la pantalla.

## Contexto

Durante una sesión el móvil suele estar en el suelo o alejado del usuario (sensor en el saco). No hay forma de saber en el momento si un golpe fue especialmente fuerte sin revisar el historial al terminar. `trainingStore` ya expone `getUserPowerMax(profileId)` y `audioService` ya tiene métodos de sonido — la feature es pura integración, sin datos ni servicios nuevos.

## Problem Statement

El usuario no recibe ningún refuerzo positivo en el momento del golpe. La motivación y el feedback de rendimiento solo llegan al final de la sesión, cuando ya no sirve para ajustar el esfuerzo durante el entrenamiento.

## User Story

**Como** usuario entrenando con Hit Tracker,
**quiero** escuchar un aviso sonoro cuando supero mi máximo histórico de potencia,
**para** tener refuerzo inmediato sin necesidad de mirar el móvil.

## Feature Scope

### Incluye

1. Cálculo de `userHistoricMax` al iniciar la sesión (`getUserPowerMax(profile.id)`), una sola vez — no en cada golpe.
2. En el callback de detección de impacto (`useTraining`, donde ya se procesa cada `Impact`):
   - Si `impact.isValid && userHistoricMax > 0 && impact.magnitude > userHistoricMax` → `audioService.beep()`.
3. Un único aviso por golpe. Sin cooldown adicional: si el usuario encadena varios golpes que superan el máximo, suena en cada uno (es la señal deseada, no ruido).
4. Si `userHistoricMax === 0` (usuario sin histórico, ej. primera sesión con el perfil), no se dispara nunca — comportamiento ya cubierto por el `> 0` en la condición.
5. Configurar el modo de audio para que el beep haga **ducking** sobre música externa (Spotify, YouTube Music, etc.) en lugar de sonar mezclado o silenciado por ella. Es configuración de sesión de audio del SO, no lógica nueva de la app — se activa una vez al iniciar el entrenamiento, no en cada beep.

### Fuera de alcance

- Ajustar el sonido usado (se reutiliza `beep()` existente; no se crea un sonido nuevo dedicado, salvo que en QA se decida que se confunde con otros avisos de audio ya existentes en `useTraining`, en cuyo caso se evalúa un sonido distinto).
- Notificación visual en pantalla (fuera del propósito: el caso de uso es "sin mirar el móvil").
- Persistir o loggear cuántas veces se ha superado el máximo (no es un logro/achievement, es feedback transitorio).
- Comparar contra el máximo de la ronda actual (eso ya existe implícitamente vía `RoundStats.powerMax`); esta feature compara solo contra el histórico de sesiones anteriores.

## Technical Requirements

### Dónde vive la lógica

Toda la lógica de negocio (comparación, condición del aviso) va en `useTraining.ts`, no en componentes UI ni en `trainingService` — es un efecto derivado de un impacto ya validado, no una regla de dominio nueva que necesite tests de `shared/`.

```typescript
// useTraining.ts

// Al iniciar la sesión (startTraining), una sola vez:
const userHistoricMax = trainingStore.getUserPowerMax(profile.id);

// En el punto donde ya se recibe cada Impact validado:
function handleImpact(impact: Impact) {
  trainingService.onImpactDetected(impact);

  if (impact.isValid && userHistoricMax > 0 && impact.magnitude > userHistoricMax) {
    audioService.beep();
  }

  // ... resto de la lógica existente
}
```

No se necesita nuevo estado en Zustand: `userHistoricMax` es una constante local de la sesión (calculada una vez al arrancar), no algo que cambie durante el entrenamiento ni que otras pantallas necesiten leer.

### Ducking de audio

El usuario suele entrenar con música de fondo (Spotify, YouTube Music). Sin ducking, el beep se pierde mezclado con la música o el sistema lo reproduce por encima sin bajar el resto — depende del SO y no es controlable desde la app. La solución no es subir el volumen del beep (no arregla nada si la música va alta), sino pedirle al sistema operativo que baje temporalmente el audio externo mientras suena el beep, que es justo lo que hace el modo `duckOthers`.

Se configura la sesión de audio **una sola vez**, al arrancar el entrenamiento — no en cada llamada a `beep()`:

```typescript
import { setAudioModeAsync } from 'expo-audio';

// Al iniciar la sesión (startTraining), junto al cálculo de userHistoricMax:
await setAudioModeAsync({
  playsInSilentMode: true,
  shouldDuckAndroid: true,
  interruptionModeIOS: 'duckOthers',
  interruptionModeAndroid: 'duckOthers',
});
```

El SO se encarga de bajar y restaurar el volumen de la música automáticamente en cada beep; no hay que gestionar fade ni estado propio.

### Por qué no recalcular en cada golpe

`getUserPowerMax` recorre las últimas 5 sesiones del perfil — es barato, pero no aporta nada recalcularlo por golpe: el histórico no cambia hasta que termina la sesión actual y se persiste. Calcularlo una vez al iniciar evita trabajo redundante sin ganar nada a cambio.

## Acceptance Criteria

- [x] Al iniciar una sesión, se calcula `userHistoricMax` una única vez (`userPowerRef` en `Session/index.tsx` y `PlanRunner.tsx`, ya existía en el código y se reutiliza).
- [x] Un golpe con `magnitude > userHistoricMax` dispara `audioService.beep()`. Nota: el tipo `Impact` del proyecto no tiene campo `isValid` — el array `impacts` de `useSensorData` ya contiene únicamente golpes confirmados (la validación ocurre antes, en la detección de picos), así que no hace falta comprobarlo de nuevo aquí.
- [x] Si `userHistoricMax === 0` (sin histórico), nunca suena el aviso.
- [x] (cubierto por la nota anterior — no aplica campo `isValid`, ver criterio 2).
- [ ] El aviso no interfiere ni se solapa de forma confusa con los sonidos existentes de `useTraining` — **pendiente de validar en sesión real**.
- [ ] La sesión de audio se configura con `duckOthers` al iniciar el entrenamiento — implementado con `setAudioModeAsync({ interruptionMode: 'duckOthers' })`, **pendiente de validar en dispositivo real con música de fondo** (API de `expo-audio` 56.x unifica el modo, sin campos separados iOS/Android).
- [ ] La música externa recupera su volumen normal tras el beep — **pendiente de validar en dispositivo real** (comportamiento gestionado por el SO, no por la app).

## Deliverables

1. **Código**: cambio en `useTraining.ts` (cálculo de `userHistoricMax` + condición en el handler de impacto).
2. **Tests**: `src/__tests__/HT-023.test.ts` — 6/6 pasando (histórico 0, por debajo, igual, por encima, múltiples golpes consecutivos sin cooldown, histórico negativo). No se testea `isValid` porque el tipo `Impact` no lo tiene (ver nota en Acceptance Criteria).
3. **Documentación**: mención breve en `DOCUMENTO_TECNICO.md`, sección `useTraining` — hecho.

## QA

- ✅ TypeScript: sin errores (`npx tsc --noEmit`)
- ✅ Tests HT-023: 6/6 pasando
- ✅ Tests globales: 90/90 pasando (10 suites), sin regresiones
- ⚠️ Pendiente de validación manual en dispositivo real: distinción de sonidos en sesión real, y comportamiento de ducking con música externa (no verificable por tests).

## Estimated Effort

- Integración en `useTraining.ts` + configuración de ducking: ~1-2h
- Tests: ~1h
- Validación en sesión real (sonido distinguible + ducking real con música de fondo): ~1h
- **Total**: ~3-4h
