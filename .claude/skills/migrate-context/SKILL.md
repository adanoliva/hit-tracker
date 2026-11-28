---
name: migrate-context
description: Checklist paso a paso para migrar un bounded context de HIT TRACKER (Training, Calibration, Device, WorkoutPlan, Sync) a la nueva estructura por capas (domain/application/infrastructure/presentation) definida en docs/PROPUESTA-CLEAN-ARCHITECTURE.md. Úsala cada vez que se migre uno de esos contextos, para que todos sigan el mismo orden y ninguno se salte pasos (tests, borrado de código viejo, actualización de imports).
---

# Migrar un bounded context a Clean Architecture

Referencia obligatoria: `docs/PROPUESTA-CLEAN-ARCHITECTURE.md`. Si ese archivo no existe o el contexto a migrar no aparece en su sección 2 (bounded contexts) o 3 (estructura de carpetas), detenerse y pedir que se defina ahí primero — no improvisar la estructura de capas.

Aplica un contexto a la vez. No arrancar el siguiente hasta cerrar el checklist completo del actual.

## Orden fijo por contexto

1. **Domain** — mover/crear entidades, value objects, interfaces de repositorio/gateway y servicios de dominio puros (sin imports de React Native, Expo, Zustand, ni de otras capas). Si la lógica ya existe en `shared/services/*` o en un hook/store, se mueve tal cual primero y se limpia después — no reescribir y mover a la vez.
2. **Tests de domain** — unitarios puros, sin mocks, antes de seguir a application. Si el dominio no es testeable sin mocks, es señal de que algo de infraestructura se coló ahí — corregir antes de avanzar.
3. **Application** — casos de uso, uno por operación de negocio (no un "service" fachada con métodos sueltos). Cada caso de uso recibe sus dependencias (repos/gateways) por constructor o parámetro, nunca las instancia él mismo.
4. **Tests de application** — con repositorios/gateways *fake* en memoria que implementen la misma interfaz que la infraestructura real. Si un test de caso de uso necesita mockear `expo-file-system` o `react-native-ble-plx`, la interfaz está mal definida — el fake debe bastar.
5. **Infrastructure** — implementar las interfaces de domain con las dependencias de plataforma reales (expo-file-system, ble-plx, fetch, etc). Solo se testean los adaptadores con lógica no trivial (parsers, transformaciones); los wrappers finos de una sola llamada no llevan test, según convención del proyecto.
6. **Presentation** — el hook/store existente se recorta a: llamar el caso de uso + sincronizar estado de UI. Si después de recortar sigue teniendo cálculos o validaciones, esa lógica no terminó de moverse — volver al paso 1 o 3.
7. **Composition root** — cablear el caso de uso con su implementación de infraestructura concreta en `src/app/composition.ts` (o el archivo equivalente ya creado por un contexto anterior).
8. **Borrar código viejo** — el archivo/función original en `shared/services/*`, el store o el hook deja de existir o queda como wrapper delgado si otro contexto aún lo importa. No dejar dos implementaciones de la misma lógica conviviendo "por las dudas".
9. **Actualizar imports** en toda la app que apuntaban al código viejo (`@shared/*`, stores, hooks).
10. **Pasada de limpieza**: invocar `ponytail-review` (o `simplify`) sobre el diff del contexto antes de darlo por cerrado — Clean Architecture invita a interfaces con una sola implementación, factories de más, o capas vacías. Podar lo que no se está usando todavía.
11. **`npm run test`** completo (no solo el contexto nuevo) — un contexto migrado no debe romper otro que todavía no se tocó.
12. Marcar el contexto como migrado en `docs/PROPUESTA-CLEAN-ARCHITECTURE.md` (o en el tracking que se esté usando) antes de pasar al siguiente.

## Señales de que algo se saltó un paso

- Un caso de uso importa `expo-*` o `react-native-*` directamente → falta la interfaz en domain.
- Un test de application falla al correr en un entorno sin RN/Expo instalado → está mockeando en vez de usar un fake.
- Un store de Zustand del contexto migrado sigue teniendo un `reduce`, `Math.` o validación de negocio → el paso 6 no terminó.
- Existen dos funciones que calculan lo mismo (una vieja, una nueva) → falta el paso 8.
- El contexto Sync se migra antes que Training o Calibration → viola el orden de dependencias de la sección 7 de la propuesta (Sync depende de los repos de esos dos).
