# Contribuir a HIT TRACKER

## Proceso de contribución

1. **Abre un issue** antes de empezar trabajo significativo — evita duplicar esfuerzo.
2. **Forkea** el repositorio y trabaja en una rama con nombre descriptivo (`fix/ble-scan`, `feat/HT-007`).
3. **Abre una Pull Request** contra `main` con la plantilla de abajo.
4. Un mantenedor revisa usando el checklist de esta guía. Sin aprobación no se mergea.

---

## Plantilla de PR

Al abrir una PR, incluye:

```
## Qué hace este cambio
<!-- Una o dos frases -->

## Por qué es necesario
<!-- Problema que resuelve o feature que añade -->

## Cómo probarlo
<!-- Pasos concretos para verificar que funciona -->

## Checklist del autor
- [ ] Los tests existentes pasan (`npm test`)
- [ ] He añadido tests para lógica nueva o modificada
- [ ] No introduzco dependencias nuevas sin justificación
- [ ] Los cambios aplican a Desktop Y Mobile si la feature es cross-platform
```

---

## Checklist de revisión (mantenedor)

### Seguridad
- [ ] No se introducen dependencias de terceros sin revisar su origen y mantenimiento
- [ ] No se exponen datos del usuario fuera del dispositivo sin consentimiento explícito
- [ ] No hay secretos, tokens ni credenciales en el código o los assets
- [ ] El código no ejecuta comandos de sistema ni accede a rutas arbitrarias fuera de `HitTracker/`

### Corrección
- [ ] La lógica de negocio está cubierta por tests en `shared/__tests__/` o `src/renderer/src/__tests__/`
- [ ] No hay regresiones en los tests existentes
- [ ] Los tipos TypeScript son correctos — sin `any` sin justificar
- [ ] Los casos borde están contemplados (sesión vacía, perfil sin calibrar, BLE desconectado)

### Arquitectura
- [ ] La lógica de negocio pura va en `shared/` — no en componentes React
- [ ] La persistencia desktop usa `invoke()` de Tauri, no acceso directo a fs desde el renderer
- [ ] Los stores Zustand no contienen lógica de negocio — solo estado y persist
- [ ] Los cambios cross-platform se aplican en Desktop (`src/renderer/`) Y Mobile (`mobile/`)

### Calidad
- [ ] No hay código muerto ni imports sin usar
- [ ] No se añaden abstracciones sin necesidad concreta (YAGNI)
- [ ] Los nombres de variables y funciones son descriptivos en el contexto del dominio (golpe, ronda, perfil...)
- [ ] No hay comentarios que expliquen qué hace el código — solo por qué si es no obvio

### UX / UI
- [ ] Los iconos usan Lucide (`lucide-react` en desktop, `lucide-react-native` en mobile) — sin emojis
- [ ] El diseño sigue la paleta de colores existente (`bg-bg-*`, `text-text-*`, `accent`, `secondary`)
- [ ] Los textos en español, sin mezclar idiomas en la UI

---

## Distribuciones y forks

HIT TRACKER es GPL v3. Puedes forkear y modificar, pero:
- Cualquier distribución derivada debe mantener la licencia GPL v3
- Las distribuciones externas a este repositorio **no están verificadas** por los autores originales
- No distribuyas builds que mezclen este código con componentes privativos

El repositorio oficial es [github.com/adanoliva/hit-tracker](https://github.com/adanoliva/hit-tracker).
