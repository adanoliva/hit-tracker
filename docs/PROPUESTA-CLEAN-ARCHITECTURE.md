# Propuesta: Clean Architecture + DDD + SOLID para HIT TRACKER

Estado: **propuesta para revisión — no implementada**. Decisiones ya tomadas con el usuario: migración completa en un solo esfuerzo (no incremental por contexto), inyección de dependencias manual (factories + Context, sin librería nueva), reestructuración tanto de `shared/` como de `src/` por capas.

## 1. Problemas detectados en el código actual

Mapeo de la exploración del código a los principios que se violan, para justificar cada cambio de la sección 3:

| Problema | Ubicación | Principio afectado |
|---|---|---|
| `TrainingService` es un singleton con estado mutable en memoria (`current`, `currentRound`), mezcla orquestación temporal con cálculo de estadísticas | `shared/services/training.ts` | SRP, DIP (no inyectable, no testeable en paralelo) |
| Algoritmo de detección de picos (umbral dinámico, cooldown, floor exponencial) vive en un hook de React, no en el dominio | `src/core/hooks/useSensorData.ts` | Capas (lógica de dominio en presentación) |
| `getUserPowerMax` y cálculo de tendencia/fatiga viven en un store de Zustand | `src/core/stores/trainingStore.ts` | Capas (lógica de dominio en estado de UI) |
| Lógica de eje temporal de gráfica reimplementada en el test en vez de importarse | `shared/__tests__/HT-002.test.ts` vs `SessionDetail/` | Indica que la lógica real vive en el componente, no en un lugar testeable aislado |
| Migración de versiones de `Training` duplicada en dos sitios distintos | `shared/services/migration.ts` vs `src/services/storage.ts` (`migrateTraining`) | DRY / única fuente de verdad |
| `driveSync.ts` lee y escribe directamente `trainingStore`, `profileStore`, `driveStore` y `storage` | `src/services/driveSync.ts` | DIP (infraestructura acoplada a implementaciones concretas de estado, no a interfaces) |
| Sin distinción entre "paquete de dominio" (`shared/`) y "resto de la app" (`src/`) — no hay regla de dependencias verificable | todo el repo | Clean Architecture (no hay fronteras de capa) |

## 2. Bounded contexts (DDD)

| Contexto | Aggregate root | Entidades/VOs | Responsabilidad |
|---|---|---|---|
| **Training** | `Training` | `Round`, `Impact`, `RoundStats` (VO) | Ciclo de vida de una sesión de entrenamiento: iniciar, registrar golpes, cerrar rondas, cerrar sesión, calcular estadísticas |
| **Calibration** | `CalibrationProfile` | `CalibrationWindow` (VO), `Intensity` (VO) | Crear y analizar perfiles de calibración del sensor por usuario |
| **Device** | `Device` | — | Identidad y estado de conexión de un dispositivo BLE emparejado |
| **WorkoutPlan** | `WorkoutPlan` | `BoxingPhaseConfig`, `BoxingRoundScript` (VOs) | Definición y ejecución de planes de entrenamiento (calentamiento + core + boxeo) |
| **Sync** | — (proceso, no aggregate) | `SyncConflict` (VO) | Sincronización de datos del usuario con Google Drive |

**Shared Kernel**: catálogo de `Exercise` y `Routine` (`shared/data/exercises.json`, `routines.json`) — lo consumen `WorkoutPlan` y el catálogo/búsqueda Wger. Vive en `shared-kernel/`, no pertenece a un solo contexto.

**Platform** (no es DDD, es infraestructura transversal sin lógica de negocio): `audio.ts`, helpers genéricos de `expo-file-system`. No se modela como contexto.

## 3. Capas y estructura de carpetas

Regla de dependencia (Clean Architecture): `presentation → application → domain`. `infrastructure` **implementa** interfaces definidas en `domain`/`application`, nunca al revés. `domain` no importa nada de React Native, Expo, Zustand ni de ninguna otra capa.

```
src/
  contexts/
    training/
      domain/
        entities/           Training.ts, Round.ts, Impact.ts
        value-objects/       RoundStats.ts, Intensity.ts
        services/            PeakDetectionService.ts (interfaz + implementación pura, ex-useSensorData)
        repositories/         TrainingRepository.ts (interfaz)
      application/
        use-cases/           StartTrainingUseCase, RecordImpactUseCase, FinishRoundUseCase,
                              FinishTrainingUseCase, GetTrainingHistoryUseCase,
                              GetUserPowerMaxUseCase, GetTrainingTrendUseCase
      infrastructure/
        FileSystemTrainingRepository.ts   (implementa TrainingRepository con expo-file-system)
      presentation/
        hooks/useTraining.ts   (delgado: llama casos de uso, sin lógica)
        store/trainingStore.ts (solo estado de UI: fase activa, id de sesión en curso)
        components/            Session/, SessionDetail/, parte de Dashboard/

    calibration/
      domain/       CalibrationProfile.ts, CalibrationAnalysisService.ts
      application/  CreateProfileUseCase, AnalyzeCalibrationUseCase, GetActiveProfileUseCase
      infrastructure/ FileSystemProfileRepository.ts
      presentation/ hooks/, store/profileStore.ts, components/Profiles/

    device/
      domain/       Device.ts, DeviceGateway.ts (interfaz: connect/disconnect/read)
      application/  PairDeviceUseCase, ConnectDeviceUseCase, ListDevicesUseCase
      infrastructure/ BleDeviceGateway.ts (implementa DeviceGateway con ble.ts/bleConnection.ts)
      presentation/ hooks/useBleReading.ts, store/deviceStore.ts, components/Devices/

    workout-plan/
      domain/       WorkoutPlan.ts, BoxingPhaseConfig.ts
      application/  CreatePlanUseCase, RunPlanUseCase, catálogo (usa shared-kernel)
      infrastructure/ FileSystemPlanRepository.ts, WgerCatalogGateway.ts
      presentation/ hooks/useWorkoutPlayer.ts, store/{workoutPlanStore,customExerciseStore}.ts,
                     components/PlanRunner/, components/Workout/

    sync/
      application/  SyncNowUseCase, ResolveConflictUseCase (dependen de los repos de arriba, no de stores)
      infrastructure/ GoogleDriveGateway.ts, GoogleAuthGateway.ts
      presentation/ store/driveStore.ts, UI de sync (dentro de Profiles/ o pantalla propia)

  shared-kernel/
    domain/         Exercise.ts, Routine.ts
    infrastructure/ ExerciseCatalogRepository.ts (lee exercises.json/routines.json)

  platform/          audio.ts, fs helpers genéricos — sin lógica de negocio

  app/                composition root: navigation, theme, wiring de use cases con infra concreta
```

`shared/` (el paquete actual) desaparece: su contenido se reparte entre `domain/` de cada contexto y `shared-kernel/`. Se elimina el alias `@shared/*` una vez migrado.

## 4. SOLID — regla concreta por caso detectado

- **SRP**: `TrainingService` (god-object) se descompone en un caso de uso por operación (`StartTrainingUseCase`, `RecordImpactUseCase`, `FinishRoundUseCase`, `FinishTrainingUseCase`). Cada uno una responsabilidad, sin estado propio — el estado vive en el aggregate `Training` que el repositorio devuelve y persiste.
- **OCP**: la diferencia de comportamiento entre firmware V2 (detección por pico ascendente/descendente) y V3/V4 (`isPeak` ya viene calculado) se modela como dos implementaciones de `PeakDetectionService`, seleccionadas por versión de sensor — hoy es un `if` inline en el hook. Añadir un V5 no debería tocar código existente.
- **LSP**: cualquier implementación de `PeakDetectionService` o `TrainingRepository` debe ser sustituible sin que el caso de uso que la consume cambie de comportamiento (garantizado por tests de contrato con fakes en memoria).
- **ISP**: si `SessionDetail` solo necesita leer histórico, no debe depender de una interfaz `TrainingRepository` con `save`/`delete`. Se separa en `TrainingReader` (query) y `TrainingWriter` (comandos) si el análisis de uso real lo justifica al implementar.
- **DIP**: `application/` depende de interfaces (`TrainingRepository`, `DeviceGateway`, `GoogleDriveGateway`) definidas en `domain`, nunca de `expo-file-system` o `react-native-ble-plx` directamente. La capa `infrastructure` las implementa. El "composition root" en `app/` es el único lugar que conoce las implementaciones concretas y arma los casos de uso con `new UseCase(new FileSystemTrainingRepository())`.

## 5. Inyección de dependencias (decidido: manual, sin librería)

- Los casos de uso son clases o funciones que reciben sus dependencias por constructor/parámetro (factories simples, sin decoradores).
- Un composition root único (`src/app/composition.ts`) instancia infraestructura concreta y arma los casos de uso.
- Se expone a la capa de presentación vía un React Context (`UseCasesProvider`) o, más simple, un objeto `useCases` importado directamente donde no hace falta mockear (dado que no se testean componentes, esto es aceptable). Los hooks (`useTraining`, etc.) consumen ese objeto y quedan reducidos a: llamar caso de uso + sincronizar con el store de UI.

## 6. Estrategia de tests

- **Domain**: tests unitarios puros, sin mocks — entidades y value objects son funciones/clases sin IO.
- **Application (casos de uso)**: tests unitarios con repositorios/gateways *fake* en memoria (implementan la misma interfaz que la infraestructura real). No requieren mockear React Native.
- **Infrastructure**: solo se testean los adaptadores con lógica no trivial (parsers binarios `parseV1/V2/V3` de `bleConnection.ts` son funciones puras — buenos candidatos). Los wrappers finos (ej. un `save()` que solo llama a `expo-file-system`) no se testean — coincide con la convención ya establecida en `CLAUDE.md` ("no se testean componentes").
- **Presentation**: sigue sin testearse (hooks fino + componentes), igual que hoy.
- Se **eliminan** `HT-002.test.ts` y `HT-008.test.ts` en su forma actual (reimplementan lógica) y se reemplazan por tests que importan la lógica real ya movida a `application`/`domain`.
- Convención de nombre de test se mantiene: `HT-XXX.test.ts` por feature, o `<nombre-del-caso-de-uso>.test.ts`.

## 7. Orden de migración (una sola entrega, pero con secuencia de construcción interna)

Aunque se entrega todo junto, conviene construir en este orden por dependencias entre contextos:

1. Crear el esqueleto de carpetas (`contexts/`, `shared-kernel/`, `platform/`, `app/`) sin mover código todavía.
2. `shared-kernel` (catálogo Exercise/Routine) — no depende de nada más.
3. Contexto **Calibration** — lo consume Training.
4. Contexto **Training** — el más grande, corazón del dominio.
5. Contexto **Device** — infraestructura BLE.
6. Contexto **WorkoutPlan** — depende de shared-kernel.
7. Contexto **Sync** — depende de los repositorios de Training/Calibration ya migrados.
8. Borrar `shared/` legado y el alias `@shared/*`, actualizar imports en toda la app.
9. Actualizar `docs/ARQUITECTURA.md`, `docs/DOCUMENTO_TECNICO.md` y `CLAUDE.md` para reflejar la nueva estructura.

## 8. Riesgos y puntos a validar durante la implementación

- `driveSync.ts` es el componente más acoplado hoy (toca 4 módulos distintos directamente); su refactor a `SyncNowUseCase` con puertos es el que más superficie de bug tiene — revisar con cuidado antes de dar por cerrado el contexto Sync.
- `useSensorData` corre en tiempo real sobre el stream BLE; mover el algoritmo a `domain/PeakDetectionService` no debe introducir asignaciones/objetos extra por lectura (200Hz) que generen presión de GC — mantenerlo con la misma forma imperativa que tiene hoy, solo cambiar dónde vive.
- No se toca el firmware (`FIRMWARE/`) — queda fuera de este refactor.
- No se tocan las pantallas (`components/`) más allá de que sus hooks pasen a ser delgados; no hay rediseño de UI en este esfuerzo.
