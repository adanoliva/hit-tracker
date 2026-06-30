# HIT TRACKER — Paleta de Colores

Colores oficiales de la app mobile y la landing web. Definidos en `src/theme.ts`.

---

## Paleta principal

```typescript
// src/theme.ts
const colors = {
  // Fondos
  bgPrimary:     '#0f0f0f',   // Fondo principal — casi negro
  bgSecondary:   '#1a1a1a',   // Fondo de cards y superficies
  bgTertiary:    '#252525',   // Fondo de elementos sobre cards

  // Bordes
  border:        '#2a2a2a',

  // Accent
  accent:        '#ff4444',   // Rojo — CTA principal, métricas destacadas
  accentHover:   '#ff6666',   // Rojo claro — hover

  // Texto
  secondary:     '#c0c0c0',   // Gris claro — texto secundario destacado
  textPrimary:   '#e0e0e0',   // Texto principal
  textSecondary: '#a0a0a0',   // Texto secundario
  textMuted:     '#808080',   // Texto muted / labels
}
```

---

## Uso por componente

### Fondos

| Elemento | Color |
|---|---|
| Pantalla (fondo raíz) | `bgPrimary` `#0f0f0f` |
| Cards, superficies | `bgSecondary` `#1a1a1a` |
| Elementos sobre cards (inputs, chips) | `bgTertiary` `#252525` |
| Bordes de cards e inputs | `border` `#2a2a2a` |

### Textos

| Uso | Color |
|---|---|
| Títulos, números principales | `textPrimary` `#e0e0e0` |
| Labels, descripciones | `textSecondary` `#a0a0a0` |
| Hints, placeholder, texto apagado | `textMuted` `#808080` |
| Texto secundario destacado | `secondary` `#c0c0c0` |

### Accent

| Uso | Color |
|---|---|
| Botones primarios, CTAs | `accent` `#ff4444` |
| Hover / estado presionado | `accentHover` `#ff6666` |
| Métricas clave (powerMax, golpes) | `accent` `#ff4444` |
| Barras de progreso, gráficos | `accent` `#ff4444` |
| Borde de card seleccionada / activa | `accent` `#ff4444` |

---

## Métricas en gráficos

| Métrica | Color |
|---|---|
| Power (magnitud / intensidad) | `accent` `#ff4444` |
| HPM (hits per minute) | `textSecondary` `#a0a0a0` |

---

## Landing web (`web/index.html`)

La landing usa exactamente los mismos valores hardcodeados como variables CSS:

```css
--bg: #0f0f0f;
--accent: #ff4444;
--text: #e0e0e0;
--text-secondary: #c0c0c0;
```

---

## Reglas

- Siempre importar `colors` de `src/theme.ts`. Nunca colores hardcodeados en componentes.
- Nunca emojis como iconos — usar `lucide-react-native`.
- Solo dark mode. No hay soporte de light mode planificado.
