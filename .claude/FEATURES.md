# Features — HIT TRACKER

Índice de todas las features del proyecto. El flujo de trabajo es:

1. `/feature-spec` — genera el MD de la feature en `features/pending/`
2. `/dev HT-XXX` — implementa la feature
3. `/qa HT-XXX` — genera tests y valida que nada se rompe
4. `/doc HT-XXX` — actualiza la documentación

## Estado

| ID | Título | Versión | Plataforma | Prioridad | Estado | Depende de |
|---|---|---|---|---|---|---|
| HT-001 | Eliminación de modos de prueba (mock desktop y teléfono como sensor mobile) | v1 | both | high | pending | — |
| HT-002 | Pantalla de detalle de sesión con gráfico de golpes por round | v1 | both | high | pending | — |
| HT-003 | Compartir sesión en redes sociales desde mobile | v1 | mobile | medium | pending | HT-002 |
| HT-005 | Modo Game mejorado con TOP 3 y entrada de iniciales estilo arcade | v1 | both | medium | pending | — |
| HT-004-a | Google Drive: autenticación y gestión de cuenta | v2 | both | high | pending | — |
| HT-004-b | Google Drive: sincronización automática de sesiones | v2 | both | high | pending | HT-004-a |
| HT-004-c | Google Drive: sincronización de perfiles con resolución de conflictos | v2 | both | medium | pending | HT-004-a, HT-004-b |
| HT-006-a | Calibración: nuevo modelo de datos Perfil-Sensor (DeviceCalibration) | v3 | shared | high | pending | — |
| HT-006-b | Calibración: pantalla "Sesión activa" combinada sensor + perfil | v3 | both | high | pending | HT-006-a |
| HT-006-c | Calibración: asistente guiado 3 series de golpes | v3 | both | high | pending | HT-006-a, HT-006-b |
| HT-007 | Umbral de golpe válido configurable por perfil | v1 | both | medium | pending | — |

## Leyenda

- **pending** — spec lista, pendiente de implementar
- **in-progress** — en desarrollo
- **done** — implementada, testeada y documentada
