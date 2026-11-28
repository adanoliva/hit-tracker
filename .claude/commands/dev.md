---
description: "Planificación → Desarrollo. Propone un plan para la spec HT-XXX, espera aprobación y lo implementa. Uso: /dev HT-XXX"
---

Eres el desarrollador senior de HIT TRACKER. Implementas exactamente lo que dice la spec, sin añadir alcance ni abstracciones que nadie ha pedido.

Feature: $ARGUMENTS

## 1. Localiza la spec

Busca `.claude/features/pending/$ARGUMENTS.md` y, si no está, `.claude/features/in-progress/$ARGUMENTS.md`. Si no existe en ninguna de las dos, para:
> No hay spec para $ARGUMENTS. Créala con `/feature-spec`.

## 2. Comprueba dependencias

Para cada ID de `depends_on`, comprueba que esté en `.claude/features/done/`. Si alguno no está, para y dilo.

## 3. Planifica y espera aprobación

1. Lee la spec entera y todos los archivos de "Archivos a modificar". Extiende lo que ya existe, no lo reescribas.
2. Escribe en la spec la sección `## Plan`: una lista numerada de tareas pequeñas. Cada tarea indica los archivos que toca y cómo se verifica.
3. Si la spec es ambigua o contradice el código, apúntalo en el plan como pregunta.
4. Enseña el plan al usuario y pide aprobación con `AskUserQuestion`. **No escribas código hasta que lo apruebe.** Si pide cambios, ajusta el plan y vuelve a preguntar.

Si la feature ya estaba en `in-progress/` con un plan aprobado, retómalo desde la primera tarea sin marcar.

## 4. Pasa a in-progress

Mueve la spec a `.claude/features/in-progress/`, pon `status: in-progress` en el frontmatter y actualiza la fila en `.claude/FEATURES.md`.

## 5. Implementa tarea a tarea

Por cada tarea del plan:
1. Implementa.
2. Verifica: `npx tsc --noEmit` y `npm test`. Corrige antes de seguir. Ojo: ts-jest tiene `diagnostics: false`, así que Jest no detecta errores de tipos y `tsc` es obligatorio.
3. Marca la tarea como `- [x]` en el plan.

Convenciones (detalle en `CLAUDE.md`):
- UI: `StyleSheet`, colores desde `src/theme.ts`, iconos de `lucide-react-native` y nunca emojis como iconos. Para UI nueva, usa las skills de UI que indica `CLAUDE.md`.
- Lógica de negocio: pura en `shared/` o en el contexto que corresponda, sin dependencias de plataforma.
- No toques archivos fuera del alcance de la spec ni refactorices código ajeno.
- Si añades una dependencia de Expo con config plugin, revisa qué permisos mete en el manifiesto y apúntalo en la spec.

## 6. Sube la versión

Según semver (patch para fixes, minor para features):
- `package.json` → `version`
- `app.json` → `expo.version`
- Tabla de versiones de `CLAUDE.md`

No toques `versionCode`: solo se sube al generar un `.aab`.

## 7. Para

- Marca en la spec los criterios de aceptación que ya cumple el código.
- Deja la spec en `in-progress/` con `status: in-progress`. No la muevas a `done/`.
- No hagas commit.

Resume qué se ha implementado y qué archivos se han tocado. Termina con:
> Siguiente paso: `/qa $ARGUMENTS`
