# Imágenes de ejercicios (GymVisual)

Convención: cada imagen/GIF se guarda como `<id>.gif` o `<id>.jpg` (el `id` del dataset de GymVisual/exercises-dataset, sin el prefijo `gv-`).

Tras copiar archivos nuevos aquí, ejecuta:

```
npm run images:gen
```

Esto regenera `src/generated/exerciseImages.ts` con los `require()` estáticos que React Native necesita para empaquetar las imágenes. Si un ejercicio no tiene archivo aquí, simplemente no se muestra imagen (no falla).

## Estado

Los 38 ejercicios del catálogo base (`shared/data/exercises.json`, `id` con prefijo `gv-`) tienen imagen cargada aquí a 720px. Ver `gymvisual-shortlist.md` en la raíz del repo para el detalle y las sustituciones aplicadas.
