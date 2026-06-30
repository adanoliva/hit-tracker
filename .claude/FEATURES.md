# Features — HIT TRACKER

Índice de todas las features del proyecto. El flujo de trabajo es:

1. `/feature-spec` — genera el MD de la feature en `features/pending/`
2. `/dev HT-XXX` — implementa la feature
3. `/qa HT-XXX` — genera tests y valida que nada se rompe
4. `/doc HT-XXX` — actualiza la documentación

## Estado

| ID | Título | Versión | Plataforma | Prioridad | Estado | Depende de |
|---|---|---|---|---|---|---|
| HT-001 | Eliminación de modos de prueba (mock desktop y teléfono como sensor mobile) | v1 | both | high | done | — |
| HT-002 | Pantalla de detalle de sesión con gráfico de golpes por round | v1 | both | high | done | HT-009-b |
| HT-003 | Compartir sesión en redes sociales desde mobile | v1 | mobile | medium | done | HT-002 |
| HT-005 | Modo Game mejorado con TOP 3 y entrada de iniciales estilo arcade | v1 | both | medium | done | HT-009-b |
| HT-004-a | Google Drive: autenticación y gestión de cuenta | v2 | both | high | pending | — |
| HT-004-b | Google Drive: sincronización automática de sesiones | v2 | both | high | pending | HT-004-a |
| HT-004-c | Google Drive: sincronización de perfiles con resolución de conflictos | v2 | both | medium | pending | HT-004-a, HT-004-b |
| HT-011 | Sistema de logros (Achievements) | v2 | both | medium | pending | — |
| HT-012 | Grabación de vídeo sincronizada con sensor (overlay en reproducción) | v2 | mobile | medium | pending | — |
| HT-013 | Exportar vídeo con overlay de golpes baked in | v2 | mobile | medium | pending | HT-012 |
| HT-014 | Asistente de auto-calibración guiado desde el perfil | v2 | both | high | done | — |
| HT-V3 | Firmware V3 — detección en sensor + sincronización de perfil via BLE | v2 | mobile+hw | high | done | HT-014 |
| HT-006-a | Calibración: nuevo modelo de datos Perfil-Sensor (DeviceCalibration) | v3 | shared | high | pending | — |
| HT-006-b | Calibración: pantalla "Sesión activa" combinada sensor + perfil | v3 | both | high | pending | HT-006-a |
| HT-006-c | Calibración: asistente guiado 3 series de golpes | v3 | both | high | pending | HT-006-a, HT-006-b |
| HT-007 | Umbral de golpe válido configurable por perfil | v1 | both | medium | done | — |
| HT-008 | Power máximo del usuario basado en media de las últimas 5 sesiones | v1 | both | medium | done | — |
| HT-009-a | Potencia real: firmware V2 con raw int16 escalado (/16) | v1 | both | high | done | HT-008 |
| HT-009-b | Potencia real: display raw durante sesión y gráfica en % con referencia de 5 sesiones | v1 | both | high | done | HT-008, HT-009-a |
| HT-010 | Sistema de migraciones de datos — appVersion en Training y migrationService | v1 | both | high | done | HT-009-a |
| HT-015-a | Catálogo de ejercicios físicos local (tipos + exerciseService + JSON curado) | v2 | shared | high | **done** | — |
| HT-015-b | WorkoutPlayer — componente guiado de ejercicios físicos con timer | v2 | mobile | high | **done** | HT-015-a |
| HT-015-c | Sesión Completa — configurador de fases y flujo encadenado (físico → boxeo) | v2 | mobile | high | **done** | HT-015-a, HT-015-b |
| HT-016 | Eliminar modo Game de la aplicación | v2 | mobile | high | **done** | — |
| HT-017 | Navegación — renombrar Sesión y añadir tab Entrenamiento | v2 | mobile | high | **done** | HT-016 |
| HT-018 | WorkoutPlan — modelo de datos, store y persistencia | v2 | shared | high | **done** | HT-015-a |
| HT-019-a | Entrenamiento — lista de planes y pantalla de ejecución | v2 | mobile | high | **done** | HT-017, HT-018 |
| HT-019-b | Entrenamiento — builder de planes (nombre + selección de ejercicios) | v2 | mobile | high | **done** | HT-018, HT-019-a |
| HT-019-c | Entrenamiento — diseñador de combos por round | v2 | mobile | medium | **done** | HT-019-b |
| HT-020 | Sesión de boxing — guía de combo en pantalla durante el round | v2 | mobile | high | **done** | HT-018, HT-019-a |
| HT-021-a | Catálogo de ejercicios — UI de gestión (ver, añadir, eliminar) | v2 | mobile | medium | **done** | HT-015-a, HT-017 |
| HT-021-b | Catálogo de ejercicios — integración wger API (búsqueda e importación) | v2 | mobile | medium | done | HT-021-a |

## Leyenda

- **pending** — spec lista, pendiente de implementar
- **in-progress** — en desarrollo
- **done** — implementada, testeada y documentada
