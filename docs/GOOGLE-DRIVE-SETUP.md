# Setup de credenciales Google (Drive backup)

Pasos para crear las credenciales OAuth2 necesarias para HT-004-a/b/c (copia de seguridad en Google Drive). Es un paso manual en Google Cloud Console — no se puede automatizar.

## 1. Crear proyecto en Google Cloud Console

1. Ve a [console.cloud.google.com](https://console.cloud.google.com) y crea un proyecto nuevo (o reutiliza uno existente).
2. En **APIs & Services → Library**, activa la **Google Drive API**.

## 2. Configurar la pantalla de consentimiento OAuth

1. **APIs & Services → OAuth consent screen**.
2. Tipo de usuario: **External** (a menos que uses Google Workspace).
3. Scopes: añade `https://www.googleapis.com/auth/drive.appdata`, `openid`, `email`, `profile`.
4. Mientras la app esté en modo "Testing", solo las cuentas añadidas como "Test users" podrán conectar — añade tu cuenta ahí durante el desarrollo.

## 3. Crear credenciales OAuth2

**Importante — usar tipo "iOS", aunque la app es solo Android**: nuestro flujo (`expo-auth-session` con `AuthSession.AuthRequest` puro contra el endpoint de autorización de Google, sin el SDK nativo de Google Sign-In) usa un redirect vía scheme personalizado (`com.googleusercontent.apps.<client-id>://`). Google **rechaza ese tipo de redirect** (`error 400 invalid_request`) para credenciales tipo "Android" (que solo validan por SHA-1+package con el SDK nativo, no con el endpoint OAuth genérico) y también para tipo "Desktop app" (que espera loopback `http://localhost`, no un scheme). El único tipo de cliente que Google acepta con un scheme personalizado en este flujo es **iOS** — es un quirk conocido de la API de Google, no un error de configuración.

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Tipo de aplicación: **iOS**.
3. Bundle ID: cualquier valor con formato de package (ej. `com.hittracker.app`) — Google no lo valida realmente para este flujo.
4. Copia el **Client ID** generado (termina en `.apps.googleusercontent.com`).

## 4. Configurar la variable de entorno

En `.env` (no versionado) o como variable de entorno en build time:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=<tu-client-id>.apps.googleusercontent.com
```

Sin esta variable, `connect()` en `src/services/googleAuth.ts` falla con el error "Falta configurar EXPO_PUBLIC_GOOGLE_CLIENT_ID" (visible en la sección "Cuenta Google" de Perfiles).

**Importante — actualizar `app.json` también**: el redirect URI real no es `hittracker://` sino el scheme reverso derivado del client ID (`com.googleusercontent.apps.<client-id>`, calculado en `GOOGLE_REDIRECT_SCHEME` dentro de `googleAuth.ts`). Ese scheme tiene que estar también registrado en `app.json` → `expo.scheme` (como array, junto al scheme normal de la app) para que Android tenga el intent-filter que recibe la redirección de vuelta. Si cambias el `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, actualiza también esta entrada en `app.json` y recompila (`expo prebuild` regenera el `AndroidManifest.xml`).

## Notas

- Se usa el scope `drive.appdata`: los archivos se guardan en una carpeta oculta del Drive del usuario, invisible en drive.google.com, solo accesible por esta app. No requiere verificación de Google Cloud para uso personal/testing con cuentas añadidas como "Test users".
- Si publicas la app públicamente y superas cierto número de usuarios, Google puede requerir el proceso de verificación de la pantalla de consentimiento OAuth.
