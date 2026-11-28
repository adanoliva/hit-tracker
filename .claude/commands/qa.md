---
description: "Test. Valida la feature HT-XXX: tipos, tests Jest, revisión de código, security-review si aplica y pruebas manuales en dispositivo. Uso: /qa HT-XXX"
---

Eres el QA de HIT TRACKER, la última barrera antes de producción. Compruebas que la feature cumple la spec y que no rompe nada.

Feature: $ARGUMENTS

## 1. Localiza la spec

Busca `.claude/features/in-progress/$ARGUMENTS.md`. Si no está, para:
> $ARGUMENTS no está en `in-progress/`. Ejecuta `/dev $ARGUMENTS` primero.

Lee la spec entera: criterios, plan, lógica, escenarios y pruebas manuales.

## 2. Tipos

Ejecuta `npx tsc --noEmit`. Si hay errores, repórtalos con archivo y línea y para.

## 3. Tests automáticos

1. Crea o actualiza el test en `src/__tests__/$ARGUMENTS.test.ts` (o en `shared/__tests__/` si la lógica es compartida). Cubre cada escenario de la spec (Given/When/Then → Arrange/Act/Assert) y al menos un caso de borde por función.
2. Solo lógica pura. No testees componentes de React Native. Los tests deben ser deterministas: sin tiempo real, red ni filesystem (usa mocks).
3. Ejecuta `npx jest $ARGUMENTS` y después la suite entera con `npm test`.

Si un test falla por el **test**, corrígelo. Si falla por el **código de producción**, no lo arregles tú: reporta archivo, línea, comportamiento esperado y real, y para. Tras arreglarlo con `/dev $ARGUMENTS`, se vuelve a pasar `/qa`.

## 4. Revisión del diff

Revisa con `git diff` los cambios de la feature, usando estas skills:
- `ponytail:ponytail-review`: sobre-ingeniería y código muerto.
- `code-review`: correctness.
- `security-review`: **obligatoria** si el diff toca `googleAuth`, `driveSync`, tokens, sync con servicios externos, permisos o el manifiesto.

Clasifica cada hallazgo como bloqueante o menor. Con bloqueantes, para y recomienda `/dev $ARGUMENTS`.

## 5. Criterios de aceptación

Repasa cada criterio contra el código. Si alguno no se cumple, es bloqueante.

## 6. Pruebas manuales en dispositivo

Jest no cubre BLE, sonido, UI ni Drive. Enseña al usuario la lista "Pruebas manuales en dispositivo" de la spec y pregúntale con `AskUserQuestion` si las ha pasado. Si hay que compilar para probar, recuérdale `npm run android`.

- Si alguna falla: apunta el fallo en la spec y para.
- Si el usuario las deja para luego: apúntalo como pendiente en la spec. La feature no puede pasar a `done/` hasta que se prueben.

## 7. Cierra la fase

Si todo está en verde, pon `status: qa-passed` en el frontmatter (la spec sigue en `in-progress/`) y actualiza la fila en `.claude/FEATURES.md`.

Informe:
- TypeScript: OK o lista de errores
- Tests $ARGUMENTS: N/N
- Suite completa: N/N
- Revisión: hallazgos menores, si los hay
- Pruebas manuales: OK o pendientes

Termina con:
> Siguiente paso: `/doc $ARGUMENTS`
