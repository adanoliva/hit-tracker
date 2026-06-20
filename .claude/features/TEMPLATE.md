---
id: HT-000
title: Título de la feature
status: pending
priority: high | medium | low
platform: desktop | mobile | both
depends_on: []
created: YYYY-MM-DD
---

## Descripción

Qué hace esta feature y por qué aporta valor al usuario.

## Criterios de aceptación

- [ ] criterio 1
- [ ] criterio 2

## Requisitos técnicos

### Plataforma
- [ ] Desktop (`src/renderer/src/`)
- [ ] Mobile (`mobile/src/`)
- [ ] Shared (`shared/`)

### Archivos a modificar

- `ruta/al/archivo.ts` — qué cambiar y por qué

### Tipos nuevos o modificados

```ts
// Añadir aquí si aplica
```

### Lógica de negocio

Descripción técnica de la lógica a implementar. Incluir fórmulas, flujos de estado, condiciones de borde.

### Dependencias entre features

- Requiere HT-XXX implementada antes de poder desarrollar esta

## Escenarios de test

1. **Escenario**: nombre descriptivo
   - **Given**: estado inicial del sistema
   - **When**: acción que se ejecuta
   - **Then**: resultado esperado

2. **Escenario**: caso de error o borde
   - **Given**: ...
   - **When**: ...
   - **Then**: ...

## Notas de implementación

Cualquier detalle relevante: decisiones de diseño, alternativas descartadas, riesgos.
