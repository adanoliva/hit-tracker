import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'
import { useDriveStore, type GoogleAccount } from '../core/stores/driveStore'
import { useProfileStore } from '../core/stores/profileStore'
import { downloadAll, syncProfilesOnConnect } from './driveSync'

WebBrowser.maybeCompleteAuthSession()

const TOKENS_KEY = 'ht_google_tokens'
const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? ''
// Google solo acepta como redirect_uri su propio scheme "reverso" derivado del client id
// (no admite un scheme propio como "hittracker://" para este flujo) — hay que registrarlo
// también en app.json → expo.scheme.
const GOOGLE_REDIRECT_SCHEME = `com.googleusercontent.apps.${CLIENT_ID.replace('.apps.googleusercontent.com', '')}`
const SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.appdata']
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
}

async function persistAccount(account: GoogleAccount): Promise<void> {
  await SecureStore.setItemAsync(TOKENS_KEY, JSON.stringify(account))
}

async function clearPersistedAccount(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKENS_KEY)
}

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`userinfo error ${res.status}`)
  const data = await res.json()
  return { email: data.email, name: data.name ?? data.email }
}

// Restaura la sesión guardada al arrancar la app — no pide login si hay tokens válidos.
export async function restoreSession(): Promise<void> {
  const raw = await SecureStore.getItemAsync(TOKENS_KEY)
  if (!raw) return
  const account: GoogleAccount = JSON.parse(raw)
  useDriveStore.getState().setAccount(account)
}

export async function connect(): Promise<void> {
  const store = useDriveStore.getState()
  if (!CLIENT_ID) {
    store.setError('Falta configurar EXPO_PUBLIC_GOOGLE_CLIENT_ID')
    return
  }
  store.setConnecting(true)
  store.setError(null)
  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: GOOGLE_REDIRECT_SCHEME })
    const request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    })
    const result = await request.promptAsync(DISCOVERY)
    if (result.type !== 'success') {
      store.setConnecting(false)
      return
    }

    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
      },
      DISCOVERY
    )
    if (!tokenResult.accessToken || !tokenResult.refreshToken) {
      throw new Error('Google no devolvió refresh token — revoca el acceso previo en cuentas.google.com e inténtalo de nuevo')
    }

    const userInfo = await fetchUserInfo(tokenResult.accessToken)
    const account: GoogleAccount = {
      email: userInfo.email,
      displayName: userInfo.name,
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAt: Date.now() + (tokenResult.expiresIn ?? 3600) * 1000,
    }
    await persistAccount(account)
    store.setAccount(account)
    downloadAll() // primera conexión (o dispositivo nuevo): trae el historial de Drive sin bloquear la UI
    syncProfilesOnConnect(useProfileStore.getState().profiles)
  } catch (e) {
    store.setError(e instanceof Error ? e.message : 'Error al conectar con Google')
  } finally {
    store.setConnecting(false)
  }
}

export async function disconnect(): Promise<void> {
  await clearPersistedAccount()
  useDriveStore.getState().setAccount(null)
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleAccount | null> {
  try {
    const result = await AuthSession.refreshAsync({ clientId: CLIENT_ID, refreshToken }, DISCOVERY)
    if (!result.accessToken) return null
    const current = useDriveStore.getState().account
    if (!current) return null
    return {
      ...current,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken ?? refreshToken,
      expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
    }
  } catch {
    return null
  }
}

// Llamar antes de cualquier petición a Drive API. Refresca si va a expirar en <60s;
// si el refresh falla (token revocado), desconecta la cuenta.
export async function ensureValidToken(): Promise<string | null> {
  const account = useDriveStore.getState().account
  if (!account) return null
  if (Date.now() < account.expiresAt - 60_000) return account.accessToken

  const refreshed = await refreshAccessToken(account.refreshToken)
  if (!refreshed) {
    await disconnect()
    return null
  }
  await persistAccount(refreshed)
  useDriveStore.getState().setAccount(refreshed)
  return refreshed.accessToken
}
