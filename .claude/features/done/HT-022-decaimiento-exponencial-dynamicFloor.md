# Feature HT-022: Decaimiento exponencial del `dynamicFloor`

## Overview

Sustituir el decaimiento lineal fijo del `dynamicFloor` (0.5 raw/ms) por un decaimiento exponencial, derivado del `rebound` ya calibrado por perfil — sin introducir una constante física nueva y sin desacoplarse del sistema de calibración existente.

## Contexto

`useSensorData.ts` usa un `dynamicFloor` que sube tras cada pico y decae hacia la base (`profile.threshold × 10`) para evitar contar el rebote del saco como un golpe nuevo, sin bloquear combos rápidos reales. Actualmente decae de forma **lineal**, a una tasa fija de 0.5 raw/ms, independiente de la intensidad del golpe y del perfil calibrado.

Esto ya convive con `profile.rebound`: un cooldown en ms calculado por el wizard de calibración a partir de `HitWindow[]` reales del saco del usuario (`analyzeCalibrationWindows`). El `rebound` sí está calibrado por saco/usuario; el decaimiento lineal actual, no.

## Problem Statement

Un golpe fuerte (magnitud alta) tarda hasta ~500ms en que el `dynamicFloor` baje a la base con la tasa lineal actual, porque la tasa de bajada no depende de la magnitud del pico. Esto limita la detección de combos rápidos y potentes — justo el escenario donde más importa no perder golpes.

Un decaimiento exponencial resuelve esto de forma natural: cae rápido al principio (cuando la vibración del saco es más violenta) y se suaviza según se acerca a la base — más parecido físicamente a cómo se amortigua un rebote real.

## Por qué no una constante `lambda` fija nueva

La propuesta original sugiere un `lambda = 0.015` fijo, justificado como "factor de disipación física del saco". Esto es un problema de diseño, no solo de ajuste fino: introduciría un **segundo parámetro de amortiguación no calibrado**, en paralelo a `profile.rebound`, que sí está calibrado con datos reales por saco. Dos mecanismos resolviendo el mismo problema (cuándo el saco ha dejado de rebotar) sin estar coordinados es una fuente directa de bugs sutiles — por ejemplo, `rebound` podría decir "200ms" mientras el decaimiento exponencial con `lambda` fijo tarda 400ms en converger a la base, y el comportamiento efectivo del filtro dependería de cuál de los dos "gane" en cada caso, sin que eso sea explícito en ningún sitio.

**Solución**: derivar `lambda` del propio `rebound` calibrado, para que sea un único punto de verdad. Definimos `lambda` de forma que, transcurrido `rebound` ms desde el pico, el `dynamicFloor` haya vuelto al 95% del camino hacia la base:

```
lambda = -ln(0.05) / rebound
```

Si no hay perfil calibrado (`profile.rebound` ausente), se usa el fallback dinámico ya existente en el proyecto (`200ms + lastPeakMag × 0.3`) como base temporal de referencia para `lambda`, manteniendo el mismo criterio de "95% en ese tiempo".

## Feature Scope

### Incluye

1. Sustituir el cálculo del `dynamicFloor` en `useSensorData.ts`:
```typescript
// Antes (lineal, fijo):
// dynamicFloor decae hacia base a 0.5 raw/ms

// Después (exponencial, derivado de rebound calibrado):
const dT = reading.timestamp - prevTimestamp;
const base = profile.threshold * 10;

const effectiveRebound = profile.rebound ?? (200 + lastPeakMag * 0.3);
const lambda = -Math.log(0.05) / effectiveRebound; // 95% recuperado en effectiveRebound ms

dynamicFloor = base + (dynamicFloor - base) * Math.exp(-lambda * dT);
```

2. Al detectar un pico, el `dynamicFloor` sube a `max(base, peak × 0.4)` — esto no cambia respecto al comportamiento actual.
3. Mantener el uso de `Δt` real entre lecturas (`reading.timestamp - prevTimestamp`) en vez de asumir un intervalo fijo — más robusto frente a jitter del stream BLE.

### Fuera de alcance

- No se toca el cálculo de `cooldown` (que sigue siendo `profile.rebound ?? 200 + lastPeakMag × 0.3` para decidir si un pico cuenta como golpe nuevo). El `dynamicFloor` y el `cooldown` son mecanismos distintos que ya conviven hoy; esta feature solo cambia la forma de decaimiento del primero, reutilizando el mismo criterio de duración que ya gobierna el segundo.
- No se cambia el algoritmo de calibración (`analyzeCalibrationWindows`) ni el wizard — `rebound` se sigue calculando igual.
- No se introduce ningún campo nuevo en `CalibrationProfile`.

## Technical Requirements

### Consideraciones de migración

- Perfiles ya calibrados con `rebound` siguen funcionando sin recalibrar: el cambio es puramente en cómo se usa `rebound`, no en su valor.
- Comportamiento en perfiles sin `rebound` (calibración manual, sin wizard): usa el mismo fallback dinámico que ya existe, así que el comportamiento no calibrado se mantiene igual de predecible que antes.

### Riesgo a vigilar en QA

Con decaimiento exponencial puro, matemáticamente nunca se llega exactamente a `base` (solo se aproxima). Verificar que la comparación `prevMag > dynamicFloor` en la detección de picos siga funcionando bien cuando `dynamicFloor` está muy cerca de `base` pero no es exactamente igual — no debería ser un problema práctico (la diferencia es despreciable pasados 2-3 vidas medias), pero conviene probarlo con golpes ligeros después de un golpe fuerte, que es el caso límite.

## Acceptance Criteria

- [x] El `dynamicFloor` decae exponencialmente, no linealmente.
- [x] `lambda` se deriva de `profile.rebound` (o del fallback dinámico si no hay `rebound` calibrado) — no existe ninguna constante de decaimiento hardcodeada e independiente (se eliminó `THRESHOLD_DECAY_RATE`).
- [x] Un golpe fuerte seguido de un golpe normal a ~150-200ms se detecta correctamente como dos impactos — verificado en test (`HT-022.test.ts`, caso "combo golpe fuerte + golpe ligero"). **Pendiente de validación con sacos/combos reales.**
- [x] Perfiles existentes (con o sin `rebound`) no requieren recalibración — el cambio es solo en cómo se usa `rebound`/fallback, no en su valor.
- [x] Tests unitarios para el nuevo decaimiento en `src/__tests__/HT-022.test.ts` (no se pudo testear el hook `useSensorData` directamente porque el proyecto no tiene `@testing-library/react-hooks` ni similar instalado, y la convención existente — ver HT-008, HT-024 — es reimplicar la lógica pura extraída en el test; se siguió ese mismo patrón).

## Deliverables

1. **Código**: cambio en `useSensorData.ts` (cálculo de `dynamicFloor` y `lambda`, constantes `FLOOR_RECOVERY_FRACTION`, reutiliza `COOLDOWN_BASE_MS`/`COOLDOWN_DAMPING` existentes en vez de duplicarlas).
2. **Tests**: `src/__tests__/HT-022.test.ts` — 5/5 pasando (derivación de lambda, recuperación 95% en `effectiveRebound` ms, fallback sin `rebound`, nunca decae bajo `base`, combo fuerte+ligero).
3. **Documentación**: actualizada sección `useSensorData` en `DOCUMENTO_TECNICO.md`.

## QA

- ✅ TypeScript: sin errores (`npx tsc --noEmit`)
- ✅ Tests HT-022: 7/7 pasando (QA añadió 2 casos de borde: `prevMag > dynamicFloor` con el floor a milésimas de `base` tras varias vidas medias — el riesgo explícito de la spec —, y decaimiento monótono con deltas de 1ms simulando jitter de BLE)
- ✅ Tests globales: 106/106 pasando (12 suites), sin regresiones
- ⚠️ Pendiente de validación manual: probar con sacos/combos reales (golpes ligeros tras un golpe fuerte), tal como señala el riesgo de QA de la spec. Los tests cubren la matemática del decaimiento pero no pueden ejercitar el hook `useSensorData` en sí (sin `@testing-library/react-hooks` en el proyecto), así que no sustituyen la validación con hardware real.

## Estimated Effort

- Cambio en `useSensorData.ts`: ~1-2h
- Tests: ~1-2h
- Validación con sacos/combos reales: ~1h
- **Total**: ~3-5h
