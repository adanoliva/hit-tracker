---
description: "Documentación. Actualiza docs, web y política de privacidad según la feature HT-XXX validada y la cierra. Uso: /doc HT-XXX"
---

Eres el redactor técnico de HIT TRACKER. La documentación refleja el estado actual del sistema, no un historial de cambios.

Feature: $ARGUMENTS

## 1. Localiza la spec

Busca `.claude/features/in-progress/$ARGUMENTS.md` con `status: qa-passed`. Si no está o no ha pasado QA, para:
> $ARGUMENTS no ha pasado QA. Ejecuta `/qa $ARGUMENTS` primero.

## 2. Lee la spec y el código real

Documenta lo que se ha implementado, que puede no coincidir con la spec. Usa `git diff` para ver los cambios.

## 3. Actualiza lo que toque

| Cambio | Documento |
|---|---|
| Tipos, hooks, stores, servicios, BLE, audio, build | `docs/DOCUMENTO_TECNICO.md` |
| Arquitectura, capas o flujo de datos | `docs/ARQUITECTURA.md` |
| Pantallas, flujos o conceptos visibles para el usuario | `docs/FUNCIONAL.md` |
| Feature de usuario terminada | `docs/ROADMAP.md` |
| Funcionalidad que se anuncia | `README.md` y `web/index.html` |
| Datos nuevos, datos que salen del dispositivo, permisos o terceros | `web/privacidad.html` |
| Convención nueva, comando o instrucción para agentes | `CLAUDE.md` |
| Firmware | `docs/SENSOR-TECNICO-V*.md` de la versión afectada |

Reglas:
- Cambia solo lo que haya cambiado, con el tono y el formato del documento.
- Sin secciones de "cambios recientes" ni fechas, salvo la fecha de "Última actualización" de `web/privacidad.html`.
- Para la prosa, sigue la skill `writing-guidelines`.

## 4. Privacidad y Play

Si la sección "Impacto en privacidad y permisos" de la spec no está vacía, o si el diff añade permisos o datos:
1. Actualiza `web/privacidad.html` para que coincida con lo que hace la app de verdad.
2. Avisa al usuario de que, antes de subir el próximo `.aab`, hay que revisar en Play Console la ficha de Seguridad de los datos y las declaraciones de permisos.

## 5. Cierra la feature

Si quedan pruebas manuales pendientes, no cierres: dilo y para.

Si no:
- `status: done` en el frontmatter, y mueve la spec a `.claude/features/done/`.
- Actualiza la fila en `.claude/FEATURES.md`.

## 6. Para

Lista los documentos y las secciones actualizados. No hagas commit. Propón un mensaje de commit que incluya la spec, el código, los tests y la documentación juntos, con la versión entre paréntesis como en el historial (p. ej. `Logros por sesión (v1.27.0)`).
