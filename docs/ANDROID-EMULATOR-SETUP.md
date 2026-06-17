# Guía: Arrancar la app móvil en emulador Android

Desde cero, sin nada instalado.

---

## 1. Requisitos previos

### Java Development Kit (JDK 17)
Descargar e instalar **JDK 17** (LTS) desde:
https://adoptium.net/temurin/releases/?version=17

Verificar:
```bash
java -version
# java version "17.x.x"
```

### Android Studio
Descargar desde https://developer.android.com/studio e instalar con las opciones por defecto.

Durante la instalación seleccionar:
- Android SDK
- Android SDK Platform
- Android Virtual Device (AVD)

### Variables de entorno

En Windows, añadir al PATH (Panel de control → Sistema → Variables de entorno):

```
ANDROID_HOME = C:\Users\<tu-usuario>\AppData\Local\Android\Sdk
```

Añadir también a Path:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\emulator
```

Verificar:
```bash
adb --version
# Android Debug Bridge version X.X.X
```

### Node.js
Versión 18 o superior. Verificar:
```bash
node --version
# v18.x.x o superior
```

---

## 2. Crear un emulador Android (AVD)

1. Abrir **Android Studio**
2. Ir a `More Actions → Virtual Device Manager` (o `Tools → Device Manager`)
3. Clic en **+ Create Virtual Device**
4. Seleccionar hardware: **Pixel 7** (recomendado) → Next
5. Seleccionar imagen del sistema: **API 34** (Android 14) → Descargar si no está → Next
6. Nombre: `Pixel_7_API_34` → Finish

Para pruebas de tablet, crear un segundo AVD:
- Hardware: **Pixel Tablet**
- Imagen: **API 34**

---

## 3. Instalar dependencias del proyecto móvil

```bash
cd hit-tracker/mobile
npm install
```

---

## 4. Arrancar el emulador

Desde Android Studio: `Device Manager → ▶ Play` junto al AVD creado.

O desde terminal:
```bash
# Listar AVDs disponibles
emulator -list-avds

# Arrancar el emulador
emulator -avd Pixel_7_API_34
```

Esperar a que el emulador arranque completamente (verás la pantalla de inicio de Android).

Verificar que `adb` lo detecta:
```bash
adb devices
# List of devices attached
# emulator-5554   device
```

---

## 5. Arrancar la app en el emulador

```bash
cd hit-tracker/mobile
npm run android
```

Esto:
1. Compila el bundle JavaScript con Metro
2. Instala la APK en el emulador
3. Abre la app automáticamente

La primera vez tarda 2-3 minutos. Las siguientes son más rápidas gracias al caché de Metro.

---

## 6. Desarrollo — hot reload

Con la app abierta en el emulador, cualquier cambio en el código TypeScript/TSX se refleja en segundos sin recompilar.

Acciones útiles desde el emulador:
- `R R` (doble R en el teclado) → recarga manual
- `Ctrl+M` (o `Cmd+M` en Mac) → abre el menú de desarrollo de Expo/React Native

---

## 7. Logs y depuración

```bash
# Ver logs de la app en tiempo real
adb logcat --pid=$(adb shell pidof -s com.hittracker.app)

# O filtrar por React Native
adb logcat -s ReactNativeJS:V
```

También puedes abrir el **debugger de Chrome**: en el menú de desarrollo → `Debug JS Remotely` → abre `chrome://inspect` en Chrome.

---

## 8. Notas específicas de esta app

### BLE en emulador
El emulador **no tiene Bluetooth real**. Para probar la pantalla de Dispositivos y el entrenamiento con sensor:
- Usar un **dispositivo Android físico** (ver sección siguiente)
- O mockear el sensor: en el código de `Training/index.tsx` hay un `TODO` marcado donde conectar el BLE real; hasta entonces la sesión corre sin golpes (solo el timer y las rondas funcionan)

### Permisos BLE
En el emulador, la solicitud de permisos de Bluetooth se puede aceptar desde el diálogo que aparece al pulsar "Buscar dispositivo Bluetooth". En emulador no hará nada, pero no crasheará.

---

## 9. Probar en dispositivo físico Android (recomendado para BLE)

1. En el móvil: `Ajustes → Acerca del teléfono → Número de compilación` (pulsar 7 veces) → activa las **Opciones de desarrollador**
2. `Ajustes → Opciones de desarrollador → Depuración USB` → activar
3. Conectar el móvil al PC con cable USB
4. Aceptar el diálogo de "Permitir depuración USB" en el móvil

Verificar:
```bash
adb devices
# <id-del-dispositivo>   device
```

Arrancar en el dispositivo físico:
```bash
npm run android
```

Metro detecta automáticamente el dispositivo y despliega ahí en vez del emulador.

---

## 10. Problemas frecuentes

| Error | Solución |
|-------|----------|
| `ANDROID_HOME is not set` | Añadir la variable de entorno y reiniciar la terminal |
| `adb: command not found` | Añadir `%ANDROID_HOME%\platform-tools` al PATH |
| `SDK location not found` | Abrir Android Studio una vez para que genere `local.properties` |
| Metro se queda colgado | `Ctrl+C` → `npm start -- --reset-cache` |
| App crashea al arrancar | `adb logcat` para ver el error exacto |
| `Gradle build failed` | Borrar `mobile/android/` si existe y volver a correr `npm run android` |
| Emulador muy lento | Activar **Hardware Acceleration** en BIOS (Intel HAXM o AMD-V) |
