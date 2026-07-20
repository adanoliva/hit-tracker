// Reimplementa aquí la lógica pura de src/services/googleAuth.ts (no se importa directamente:
// el módulo real ejecuta WebBrowser.maybeCompleteAuthSession() en el import, que requiere
// bindings nativos no disponibles en el entorno de test — mismo patrón que HT-023.test.ts).

interface GoogleAccount {
  email: string
  displayName: string
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const REFRESH_MARGIN_MS = 60_000

function isTokenValid(expiresAt: number, now: number): boolean {
  return now < expiresAt - REFRESH_MARGIN_MS
}

function buildRefreshedAccount(
  current: GoogleAccount,
  refreshed: { accessToken?: string; refreshToken?: string; expiresIn?: number },
  now: number
): GoogleAccount | null {
  if (!refreshed.accessToken) return null
  return {
    ...current,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken ?? current.refreshToken,
    expiresAt: now + (refreshed.expiresIn ?? 3600) * 1000,
  }
}

const account: GoogleAccount = {
  email: 'user@gmail.com',
  displayName: 'User',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresAt: 0,
}

describe('HT-004-a — Autenticación Google y gestión de cuenta Drive', () => {
  describe('isTokenValid', () => {
    it('token con expiración futura holgada es válido', () => {
      const now = 1_000_000
      expect(isTokenValid(now + 5 * 60_000, now)).toBe(true)
    })

    it('token que expira dentro del margen de refresco (<60s) se considera inválido', () => {
      const now = 1_000_000
      expect(isTokenValid(now + 30_000, now)).toBe(false)
    })

    it('token ya expirado es inválido', () => {
      const now = 1_000_000
      expect(isTokenValid(now - 1, now)).toBe(false)
    })
  })

  describe('buildRefreshedAccount — refresco automático de tokens', () => {
    it('actualiza accessToken y expiresAt cuando el refresh es exitoso', () => {
      const now = 1_000_000
      const result = buildRefreshedAccount(account, { accessToken: 'access-2', expiresIn: 3600 }, now)
      expect(result).toEqual({
        ...account,
        accessToken: 'access-2',
        refreshToken: 'refresh-1',
        expiresAt: now + 3600 * 1000,
      })
    })

    it('conserva el refreshToken original si Google no devuelve uno nuevo', () => {
      const result = buildRefreshedAccount(account, { accessToken: 'access-2' }, 1_000_000)
      expect(result?.refreshToken).toBe('refresh-1')
    })

    it('usa el nuevo refreshToken si Google lo rota', () => {
      const result = buildRefreshedAccount(account, { accessToken: 'access-2', refreshToken: 'refresh-2' }, 1_000_000)
      expect(result?.refreshToken).toBe('refresh-2')
    })

    it('devuelve null si el refresh falla (sin accessToken) — refresh token revocado', () => {
      const result = buildRefreshedAccount(account, {}, 1_000_000)
      expect(result).toBeNull()
    })

    it('usa 3600s por defecto si Google no informa expiresIn', () => {
      const now = 1_000_000
      const result = buildRefreshedAccount(account, { accessToken: 'access-2' }, now)
      expect(result?.expiresAt).toBe(now + 3600 * 1000)
    })
  })

  describe('flujo completo ensureValidToken (simulado)', () => {
    function ensureValidToken(acc: GoogleAccount | null, now: number, refreshResult: { accessToken?: string; expiresIn?: number }) {
      if (!acc) return { account: null, accessToken: null }
      if (isTokenValid(acc.expiresAt, now)) return { account: acc, accessToken: acc.accessToken }
      const refreshed = buildRefreshedAccount(acc, refreshResult, now)
      if (!refreshed) return { account: null, accessToken: null } // disconnect()
      return { account: refreshed, accessToken: refreshed.accessToken }
    }

    it('sin cuenta conectada, no intenta refrescar', () => {
      const result = ensureValidToken(null, 1_000_000, { accessToken: 'x' })
      expect(result).toEqual({ account: null, accessToken: null })
    })

    it('token válido: devuelve el accessToken actual sin refrescar', () => {
      const now = 1_000_000
      const valid = { ...account, expiresAt: now + 10 * 60_000 }
      const result = ensureValidToken(valid, now, { accessToken: 'unused' })
      expect(result.accessToken).toBe(valid.accessToken)
    })

    it('token expirado y refresh exitoso: devuelve el nuevo accessToken', () => {
      const now = 1_000_000
      const expired = { ...account, expiresAt: now - 1 }
      const result = ensureValidToken(expired, now, { accessToken: 'access-new', expiresIn: 3600 })
      expect(result.accessToken).toBe('access-new')
      expect(result.account?.expiresAt).toBe(now + 3600 * 1000)
    })

    it('token expirado y refresh fallido (revocado): limpia la cuenta', () => {
      const now = 1_000_000
      const expired = { ...account, expiresAt: now - 1 }
      const result = ensureValidToken(expired, now, {})
      expect(result).toEqual({ account: null, accessToken: null })
    })
  })
})
