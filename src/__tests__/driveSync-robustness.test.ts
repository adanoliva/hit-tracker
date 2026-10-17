// Importa los módulos reales (googleAuth, driveSync) con los bindings nativos mockeados,
// para cubrir: refresh con fallo de red no desconecta, y borrados offline no resucitan.

const files: Record<string, string> = {}
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  writeAsStringAsync: jest.fn(async (p: string, c: string) => { files[p] = c }),
  readAsStringAsync: jest.fn(async (p: string) => {
    if (!(p in files)) throw new Error('ENOENT')
    return files[p]
  }),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => { files[to] = files[from]; delete files[from] }),
  makeDirectoryAsync: jest.fn(async () => {}),
  readDirectoryAsync: jest.fn(async () => []),
  deleteAsync: jest.fn(async () => {}),
}))
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }))
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }))
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => '{corrupto'),
  deleteItemAsync: jest.fn(async () => {}),
}))
const refreshAsync = jest.fn()
const revokeAsync = jest.fn(async () => true)
jest.mock('expo-auth-session', () => {
  class TokenError extends Error {
    params: Record<string, string>
    constructor(params: Record<string, string>) { super(params.error); this.params = params }
  }
  return { TokenError, refreshAsync: (...a: unknown[]) => refreshAsync(...a), revokeAsync: (...a: unknown[]) => (revokeAsync as any)(...a) }
})

import * as AuthSession from 'expo-auth-session'
import { ensureValidToken, restoreSession, disconnect } from '../services/googleAuth'
import { storage } from '../services/storage'
import { deleteFromDrive, downloadAll } from '../services/driveSync'
import { useDriveStore } from '../core/stores/driveStore'
import { useTrainingStore } from '../core/stores/trainingStore'

const expiredAccount = { email: 'a@b.c', displayName: 'A', accessToken: 'old', refreshToken: 'r', expiresAt: 0 }

beforeEach(() => {
  refreshAsync.mockReset()
  useDriveStore.setState({ account: { ...expiredAccount }, pendingUploads: [] })
  useTrainingStore.setState({ trainings: [] })
})

describe('googleAuth — refresh de token', () => {
  it('fallo de red: mantiene la cuenta', async () => {
    refreshAsync.mockRejectedValue(new TypeError('Network request failed'))
    expect(await ensureValidToken()).toBeNull()
    expect(useDriveStore.getState().account).not.toBeNull()
  })

  it('invalid_grant: desconecta', async () => {
    refreshAsync.mockRejectedValue(new (AuthSession as any).TokenError({ error: 'invalid_grant' }))
    expect(await ensureValidToken()).toBeNull()
    expect(useDriveStore.getState().account).toBeNull()
  })

  it('disconnect revoca el refresh token en Google y borra la cuenta aunque falle la red', async () => {
    revokeAsync.mockRejectedValueOnce(new TypeError('Network request failed'))
    await disconnect()
    expect(revokeAsync).toHaveBeenCalledWith(expect.objectContaining({ token: 'r' }), expect.anything())
    expect(useDriveStore.getState().account).toBeNull()
  })

  it('restoreSession con JSON corrupto no lanza', async () => {
    useDriveStore.setState({ account: null })
    await expect(restoreSession()).resolves.toBeUndefined()
    expect(useDriveStore.getState().account).toBeNull()
  })
})

describe('driveSync — borrados y descargas', () => {
  const fetchMock = jest.fn()
  beforeAll(() => { (globalThis as any).fetch = fetchMock })
  beforeEach(() => {
    fetchMock.mockReset()
    refreshAsync.mockResolvedValue({ accessToken: 'new', expiresIn: 3600 })
  })

  it('sesión borrada sin red no se vuelve a descargar después', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'))
    await deleteFromDrive('t-borrada')

    const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) })
    const downloaded: string[] = []
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('files?spaces')) {
        return json({ files: [{ id: 'f1', name: 'training_t-borrada.json' }, { id: 'f2', name: 'training_t-ok.json' }, { id: 'f3', name: 'training_t-mala.json' }] })
      }
      if (url.endsWith('f2?alt=media')) { downloaded.push('t-ok'); return json({ id: 't-ok', rounds: [], createdAt: 1 }) }
      if (url.endsWith('f3?alt=media')) return { ok: true, status: 200, text: async () => '{corrupto' }
      if (url.endsWith('f1?alt=media')) { downloaded.push('t-borrada'); return json({ id: 't-borrada' }) }
      return { ok: false, status: 500 } // DELETE sigue fallando
    })

    await downloadAll()
    expect(downloaded).toEqual(['t-ok']) // ni la borrada, y la corrupta no corta el bucle
    expect(useTrainingStore.getState().trainings.map((t) => t.id)).toEqual(['t-ok'])
  })
})

describe('storage — ids de sesión en rutas', () => {
  it('rechaza ids con path traversal', async () => {
    await expect(storage.saveTraining({ id: '../../profiles' } as any)).rejects.toThrow('no válido')
    await expect(storage.deleteTraining('a/b')).rejects.toThrow('no válido')
  })

  it('acepta el formato real de id', async () => {
    await storage.saveTraining({ id: 'training-2026-10-17T10-00-00-000Z' } as any)
    expect(Object.keys(files)).toContain('file:///doc/HitTracker/trainings/training_training-2026-10-17T10-00-00-000Z.json')
  })
})
