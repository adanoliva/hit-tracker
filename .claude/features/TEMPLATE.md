---
id: HT-000
title: Título de la feature
status: pending        # pending → in-progress → qa-passed → done
priority: high | medium | low
platform: mobile | shared | mobile+hw
depends_on: []
created: YYYY-MM-DD
---

## Descripción

Qué hace la feature y qué problema le resuelve al usuario.

## Alcance

- **Incluye:** …
- **No incluye:** …

## Criterios de aceptación

- [ ] criterio 1
- [ ] criterio 2

## Requisitos técnicos

### Archivos a modificar

- `ruta/real/al/archivo.ts`: qué cambiar y por qué

### Tipos nuevos o modificados

```ts
// si aplica
```

### Lógica de negocio

Fórmulas, flujos de estado y condiciones de borde.

## Impacto en privacidad y permisos

- **Datos nuevos o que salen del dispositivo:** ninguno | …
- **Permisos o config plugins de Expo nuevos:** ninguno | …

## Escenarios de test (Jest)

1. **Escenario:** nombre
   - **Given:** estado inicial
   - **When:** acción
   - **Then:** resultado esperado

2. **Escenario:** caso de error o borde
   - **Given:** …
   - **When:** …
   - **Then:** …

## Pruebas manuales en dispositivo

- [ ] prueba que Jest no puede cubrir (BLE, sonido, UI, Drive…)

## Plan

_Lo rellena `/dev` y lo aprueba el usuario antes de implementar._

## Notas

Decisiones de diseño, alternativas descartadas, riesgos.
