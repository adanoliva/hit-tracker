# TODO — HIT TRACKER Mobile

Estado del port React Native. Marca cada ítem al completarlo.

---

## Pendiente

### BLE — conexión real con el sensor

- [ ] En `Training/index.tsx`: cuando `phase === 'round'`, conectar al dispositivo seleccionado via `react-native-ble-plx`, suscribirse a la característica GATT del sensor y llamar `processReading(parsed)` por cada notificación BLE
- [ ] Parsear el payload BLE (base64 → `SensorReading`): mismo formato que el firmware ESP32
- [ ] Desconectar BLE al salir de `phase === 'round'` y al abortar
- [ ] En `Devices/index.tsx`: filtrar dispositivos en el escaneo para mostrar solo los que tienen el SERVICE_UUID del sensor (en vez de todos los BLE visibles)
- [ ] Definir `SERVICE_UUID` y `CHARACTERISTIC_UUID` que usa el firmware (añadir a `src/core/types/index.ts` o a un fichero de constantes)
- [ ] Manejar reconexión automática si se pierde la señal durante la sesión

### Audio — campana de rounds

- [ ] Instalar `expo-av` y añadir archivos de sonido en `assets/sounds/` (campana inicio, campana fin, beep countdown)
- [ ] En `useTraining.ts`: llamar al sonido correspondiente en los cambios de fase (`idle→preparing`, `preparing→round`, `round→resting`, `resting→round`, `round→finished`)

### Keep-awake durante sesión

- [ ] En `Training/index.tsx`: llamar `activateKeepAwake()` cuando `phase !== 'idle'` y `deactivateKeepAwake()` al terminar (ya está instalado `expo-keep-awake`)

### Haptics en golpes válidos

- [ ] En `Training/index.tsx`: cuando se detecta un impacto con `isValid === true`, llamar `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` (ya está instalado `expo-haptics`)

### Dashboard — gráfico de progreso

- [ ] Portar el gráfico de barras + línea del Dashboard desktop usando `victory-native` (ya instalado)
- [ ] El chart desktop usa: barras = RPM promedio por sesión, línea = power máx — mismo diseño en mobile

### Permisos Android — configuración

- [ ] Añadir en `app.json` (sección `android.permissions`):
  ```json
  ["BLUETOOTH_SCAN", "BLUETOOTH_CONNECT", "ACCESS_FINE_LOCATION"]
  ```
- [ ] Verificar que `react-native-ble-plx` está correctamente configurado para Expo (puede requerir `expo-build-properties` o un plugin de config)

### Build / distribución

- [ ] Configurar `app.json`: nombre, slug, bundle identifier (`com.hittracker.app`), versión, icono (`assets/icon.png`)
- [ ] Reemplazar assets de Expo por defecto con el logo de Hit Tracker
- [ ] Probar build con `eas build --platform android --profile preview`
- [ ] Configurar EAS (`eas.json`) con perfiles `preview` (APK) y `production` (AAB)

### Tablet layout — ajustes finos

- [ ] El Dashboard en tablet podría mostrar el gráfico de progreso y la lista de sesiones en dos columnas (igual que el desktop)
- [ ] En TrainingRound tablet: aprovechar el ancho extra para mostrar gráfico más grande y stats laterales

---

## Completado

- [x] Scaffold Expo + TypeScript en `mobile/`
- [x] Dependencias instaladas: react-navigation, react-native-ble-plx, expo-file-system, expo-keep-awake, expo-haptics, expo-av, victory-native, react-native-svg, @react-native-community/slider
- [x] `src/core/` — tipos, stores, hooks, servicios copiados del desktop
- [x] Stores desacoplados de `window.api` → usan `src/services/storage.ts` (expo-file-system)
- [x] `useLayout.ts` — detección isTablet + isLandscape
- [x] Navegación adaptativa: MobileLayout (bottom tabs) / TabletLayout (drawer permanente)
- [x] `App.tsx` — carga datos de disco al arrancar, elige layout según dispositivo
- [x] `Dashboard` — sesiones filtradas por perfil activo, lista con delete
- [x] `TrainingSetup` — selector de perfil, duración, rondas, descanso
- [x] `TrainingRound` — timer, leyenda por tipo de golpe, gráfico SVG con react-native-svg, stats en vivo
- [x] `TrainingRest` — timer de descanso, stats de ronda, comparativa vs ronda anterior, indicador de fatiga
- [x] `TrainingResults` — stats globales, desglose por ronda, mejor ronda destacada
- [x] `Training/index` — orquestador completo (mismo flujo que desktop), TODO marcado para BLE
- [x] `Devices` — lista de dispositivos, escaneo BLE real con react-native-ble-plx, renombrar, eliminar, conectar/desconectar
- [x] `Profiles` — lista, crear, editar (sliders con @react-native-community/slider), eliminar, seleccionar, guardia orthodox/southpaw
- [x] `theme.ts` — colores idénticos al desktop
