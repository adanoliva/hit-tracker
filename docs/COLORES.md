# Hit Tracker - Paleta de Colores Oficial

Colores consistentes entre web y aplicación Electron/React.

## 🎨 Paleta Principal

### Backgrounds (Oscuros)
```css
--bg-primary: #0f0f0f;      /* Fondo principal - casi negro */
--bg-secondary: #1a1a1a;    /* Fondo secundario - gris oscuro */
--bg-tertiary: #252525;     /* Fondo terciario - gris claro */
--border: #2a2a2a;          /* Color de bordes */
```

### Accents (Energía)
```css
--accent: #ff4444;          /* Rojo energético - PRIMARY CTA */
--accent-hover: #ff6666;    /* Rojo más claro - hover */
--secondary: #00d9ff;       /* Cyan eléctrico - SECONDARY */
--secondary-hover: #00f0ff; /* Cyan más claro - hover */
```

### Textos
```css
--text-primary: #e0e0e0;    /* Texto principal - blanco grisáceo */
--text-secondary: #a0a0a0;  /* Texto secundario - gris medio */
--text-muted: #808080;      /* Texto muted - gris oscuro */
```

---

## 📋 Uso Recomendado

### Componentes

**Botones Primarios**
- Background: `--accent` (#ff4444)
- Text: Blanco
- Hover: `--accent-hover` (#ff6666)
- Border: `--accent`

**Botones Secundarios**
- Background: Transparent
- Text: `--secondary` (#00d9ff)
- Border: `--secondary`
- Hover: Background rgba(0, 217, 255, 0.1)

**Cards/Superficies**
- Background: `--bg-secondary` (#1a1a1a)
- Border: `--border` (#2a2a2a)
- Hover: Background `--bg-tertiary` (#252525), Border `--accent` (#ff4444)

**Textos**
- Títulos: `--text-primary` (#e0e0e0)
- Párrafos: `--text-secondary` (#a0a0a0)
- Hints/Labels: `--text-muted` (#808080)

**Inputs/Formularios**
- Background: `--bg-secondary` (#1a1a1a)
- Border: `--border` (#2a2a2a)
- Text: `--text-primary` (#e0e0e0)
- Focus: Border `--secondary` (#00d9ff)

---

## 🎯 Casos de Uso Específicos

### Dashboard
- Background: `--bg-primary` (#0f0f0f)
- Cards: `--bg-secondary` (#1a1a1a)
- Stats highlight: Usa `--accent` (#ff4444) para números importante
- Secondary info: `--secondary` (#00d9ff)

### Métricas & Gráficos
- **Power**: Rojo (#ff4444) - es la métrica principal
- **RPM**: Cyan (#00d9ff) - métrica secundaria
- **Líneas**: Usa gradientes entre accent y secondary

### Estado & Feedback
- **Success**: Verde (considerar agregar #00ff00 o usar cyan)
- **Warning**: Naranja (considerar agregar #ff7a00)
- **Error/Alert**: Rojo (ya tenemos #ff4444)
- **Neutral**: Gris (usar --border o --text-secondary)

### Secciones de Entrenamiento
- **Durante sesión**: Fondo `--bg-secondary`, accent para barras de progreso
- **Resultados**: Destaca números en `--accent` (#ff4444)
- **Comparativas**: `--secondary` (#00d9ff) para datos positivos

---

## 💻 CSS Variables - Copia directa

Para `src/index.css` o `src/styles/variables.css`:

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a1a1a;
  --bg-tertiary: #252525;
  --border: #2a2a2a;
  
  /* Accents */
  --accent: #ff4444;
  --accent-hover: #ff6666;
  --secondary: #00d9ff;
  --secondary-hover: #00f0ff;
  
  /* Text */
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --text-muted: #808080;
  
  /* Spacing & Radius */
  --radius: 8px;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 🌐 Dark/Light Mode

**Actualmente solo Dark Mode**. Si necesitas Light Mode en el futuro:

### Light Mode (Opcional)
```css
@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-tertiary: #eeeeee;
    --border: #e0e0e0;
    --text-primary: #1a1a1a;
    --text-secondary: #666666;
    --text-muted: #999999;
    /* Accents se mantienen igual */
  }
}
```

---

## ✅ Checklist para la Aplicación

- [ ] Dashboard usa `--bg-primary` como fondo
- [ ] Cards usan `--bg-secondary` con bordes `--border`
- [ ] Botones primarios son `--accent` (#ff4444)
- [ ] Botones secundarios son `--secondary` (#00d9ff)
- [ ] Textos principales son `--text-primary`
- [ ] Gráficos: Power en rojo (#ff4444), RPM en cyan (#00d9ff)
- [ ] Hover effects: Cards cambian border a `--accent`
- [ ] Inputs tienen focus en `--secondary`
- [ ] Consistent con la web (mismos colores)

---

## 📸 Referencia Visual

**Rojo Accent**: #ff4444 - Para CTAs principales, números importantes, alertas
**Cyan Secondary**: #00d9ff - Para secundarios, información adicional
**Fondo Oscuro**: #0f0f0f - Minimalist, pro
**Gris Textos**: #e0e0e0 - Readable, cómodo para ojos

Inspiración: Linear, Raycast, Vercel, VS Code (temas oscuros modernos)

---

**Hit Tracker - Consistencia Visual = Profesionalismo** 🎯
