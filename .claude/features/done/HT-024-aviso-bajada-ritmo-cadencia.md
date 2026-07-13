# Feature HT-024: Aviso de bajada de ritmo (cadencia)

## Overview

Añadir una segunda señal de fatiga, independiente de `isFatigued` (potencia), que detecte cuándo cae el **ritmo** de golpeo (golpes/minuto) entre la primera y segunda mitad de la ronda. Se muestran como dos avisos separados en la UI — sin fusionarlos en un único indicador.

## Contexto

`isFatigued` (ver `RoundStats`) compara la intensidad media de golpes entre la primera y segunda mitad de la ronda, partiendo por **índice** de golpe (`impacts.slice(0, midIndex)`). Esto mide bien la caída de potencia por golpe, pero no dice nada sobre el volumen: un usuario puede tirar 100 golpes en la primera mitad y 20 en la segunda con intensidad media similar (golpes espaciados, sin prisa) y `isFatigued` no lo refleja, aunque el ritmo se haya desplomado.

Potencia y ritmo son señales distintas y no siempre se mueven juntas:
- Mismo ritmo, menos potencia → fatiga muscular real, el caso más común.
- Menos ritmo, misma potencia → puede ser fatiga (necesita más recuperación entre golpes) o estrategia (menos volumen, golpes más cargados).
- Ambos caen → fatiga inequívoca.

Forzar un único booleano combinado (AND u OR de las dos condiciones) da falsos positivos o falsos negativos según el caso, así que se exponen como dos señales independientes y es el usuario quien las interpreta viendo ambos avisos a la vez o por separado.

## Problem Statement

No existe ninguna señal que capture la caída de cadencia. Un usuario que reduce drásticamente el volumen de golpes en la segunda mitad de la ronda no recibe ningún aviso, aunque ese es justamente uno de los indicadores más claros de fatiga.

## User Story

**Como** usuario entrenando con Hit Tracker,
**quiero** ver si mi ritmo de golpeo ha caído en la segunda mitad de la ronda, de forma independiente a si mi potencia ha caído,
**para** entender qué parte de mi rendimiento se ha visto afectada por la fatiga.

## Feature Scope

### Incluye

1. Nuevo campo en `RoundStats`: `isCadenceDropped: boolean`. `isFatigued` se mantiene sin cambios (no se renombra — evita romper compatibilidad con sesiones ya persistidas).
2. Cálculo en `calcRoundStats` (`shared/services/training.ts`), partiendo **por tiempo**, no por índice de golpe — partir por índice ya está sesgado si la cadencia varía dentro de la ronda, que es justo lo que se quiere medir:
```typescript
const roundMidTime = round.startTime + (round.endTime - round.startTime) / 2;

const firstHalf = impacts.filter(i => i.time < roundMidTime);
const secondHalf = impacts.filter(i => i.time >= roundMidTime);

const firstHalfDuration = roundMidTime - round.startTime;
const secondHalfDuration = round.endTime - roundMidTime;

const firstHalfRate = firstHalf.length / firstHalfDuration;   // golpes/ms
const secondHalfRate = secondHalf.length / secondHalfDuration;

const isCadenceDropped = secondHalfRate < firstHalfRate * 0.7; // umbral a validar con datos reales
```

3. UI: dos avisos independientes en la pantalla de resultados/detalle de sesión, sin lógica de prioridad entre ellos:
```typescript
{stats.isFatigued && <Badge text="Potencia bajando" />}
{stats.isCadenceDropped && <Badge text="Ritmo bajando" />}
```

Si aparecen ambos a la vez, el usuario ya interpreta "fatiga general" sin que el sistema tenga que decidirlo por él con una etiqueta combinada.

### Fuera de alcance

- No se renombra `isFatigued` ni se introduce ningún tipo/enum que combine ambas señales (`FatigueState`, `'power' | 'cadence' | 'both'`, etc.) — es complejidad innecesaria si la UI ya puede mostrar los dos avisos por separado.
- No se cambia el umbral de `isFatigued` (85%) ni su lógica de partición por índice — queda exactamente igual que hoy.
- No se persiste un histórico de caída de ritmo entre sesiones (es una señal de la ronda actual, no una métrica de progreso a largo plazo).
- No se ajusta el umbral del 70% en esta iteración más allá de un valor razonable de partida — se valida con sesiones reales antes de darlo por definitivo.

## Technical Requirements

### Caso borde: rondas con muy pocos golpes

Con `firstHalf.length` o `secondHalf.length` en 0-1 golpes, `firstHalfRate`/`secondHalfRate` no son representativos y pueden disparar falsos positivos. Aplicar el mismo criterio que ya usa el proyecto en otros cálculos de fatiga/consistencia: exigir un mínimo de golpes por mitad (ej. `firstHalf.length >= 4 && secondHalf.length >= 2`) para evaluar `isCadenceDropped`; si no se cumple, queda en `false`.

### Por qué partir por tiempo y no por índice

Partir por `impacts.length / 2` asume implícitamente que el ritmo es constante — si el usuario ralentiza, la "segunda mitad por índice" ocupará más tiempo real que la primera, y comparar sus tasas ya no es una comparación justa. Partir por `startTime + duration/2` fija el tiempo y dejar que el número de golpes en cada mitad hable por sí mismo es la forma correcta de medir cadencia.

### Desviación de la spec: ancla del punto medio

`Impact.time` viene del reloj del sensor BLE (`millis()` del ESP32, ver `bleConnection.ts`), no de `Date.now()`. `Round.startTime`/`endTime` (en `trainingService`) sí usan `Date.now()`. Son relojes distintos con offsets distintos — comparar `impact.time` directamente contra `round.startTime + duration/2` habría sido incorrecto. Se ancla el punto medio en `impacts[0].time + duration/2` en su lugar (mismo reloj que el resto de impacts, `duration` es un delta de ms válido en cualquiera de los dos relojes). Pequeña imprecisión si el primer golpe tarda en llegar tras el inicio real de la ronda; asumible.

## Acceptance Criteria

- [x] `RoundStats` incluye `isCadenceDropped: boolean`, calculado por tiempo (no por índice de golpe).
- [x] `isFatigued` no cambia su cálculo ni su significado actual.
- [x] Rondas con muy pocos golpes por mitad no disparan falsos positivos de `isCadenceDropped`.
- [x] La UI muestra ambos avisos ("Potencia bajando" / "Ritmo bajando") de forma independiente en `TrainingRest.tsx` — pueden aparecer juntos, por separado, o ninguno.
- [x] Sesiones antiguas sin `isCadenceDropped` en el JSON persistido no rompen la carga (`roundStats.isCadenceDropped &&` es `falsy` con `undefined`, no hace falta migración explícita).
- [x] Tests unitarios para `isCadenceDropped`: ritmo constante, ritmo cae, ritmo sube, casos con pocos golpes por mitad (ver nota sobre ubicación en Deliverables).

## Deliverables

1. **Código**: cambio en `calcRoundStats` (`shared/services/training.ts`) + tipo `RoundStats` (`shared/types/index.ts`) + badge nuevo en `src/components/Session/TrainingRest.tsx` (icono `TrendingDown` de `lucide-react-native`, no emoji).
2. **Tests**: `src/__tests__/HT-024.test.ts` — 9/9 pasando (no `shared/__tests__/`; ver nota sobre `jest.roots` más abajo). Incluye:
   - Casos granulares (ritmo constante/cae/sube, mínimos por mitad, vacíos) contra una copia local de `calcCadenceDropped`.
   - Un `describe` de integración adicional que ejercita `trainingService.startTraining/startRound/onImpactDetected/finishRound` reales (con `Date.now()` mockeado para fijar `duration`), para detectar drift entre la copia y el código real.
3. **Documentación**: actualizado `DOCUMENTO_TECNICO.md`, secciones `RoundStats` y `trainingService`.
4. **Migración**: no ha hecho falta — `RoundStats` no está versionado por `migrationService`, y el acceso opcional en la UI ya es seguro sin él.

## QA

- ✅ TypeScript: sin errores (`npx tsc --noEmit`)
- ✅ Tests HT-024: 9/9 pasando
- ✅ Tests globales: 99/99 pasando (11 suites), sin regresiones
- ⚠️ Hallazgo de infra (no corregido, fuera de alcance): `shared/__tests__/` no está en `jest.roots` de `package.json` y no se ejecuta con `npm test`; contiene 2 tests ya rotos (`HT-007.test.ts`, calibración) sin relación con HT-024. Recomendado revisar en un ticket aparte.

## Estimated Effort

- Cálculo en `calcRoundStats` + tipos: ~1-2h
- UI (badge nuevo): ~1h
- Tests: ~1-2h
- Migración de datos existentes: ~30min
- **Total**: ~4-6h
