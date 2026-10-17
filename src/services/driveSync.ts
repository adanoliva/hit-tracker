import * as FileSystem from 'expo-file-system/legacy'
import NetInfo from '@react-native-community/netinfo'
import type { Training, CalibrationProfile } from '../core/types'
import { useDriveStore, type PendingUpload, type ProfileConflict } from '../core/stores/driveStore'
import { useTrainingStore } from '../core/stores/trainingStore'
import { useProfileStore, DEFAULT_PROFILE } from '../core/stores/profileStore'
import { ensureValidToken } from './googleAuth'
import { storage, writeJson } from './storage'

const PROFILES_FILE_NAME = 'profiles.json'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const BOUNDARY = 'ht_drive_boundary'
const MAX_RETRIES = 3
const PENDING_QUEUE_FILE = FileSystem.documentDirectory + 'HitTracker/drive-pending.json'
const PENDING_DELETES_FILE = FileSystem.documentDirectory + 'HitTracker/drive-deleted.json'

// Sesiones borradas en local cuyo borrado en Drive aún no se ha confirmado. Sin esto,
// borrar sin red (o con la cuenta desconectada) hacía que downloadAll la resucitara.
// ponytail: crece sin límite si nunca se conecta una cuenta; son solo ids
let pendingDeletes = new Set<string>()

function trainingFileName(id: string): string {
  return `training_${id}.json`
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await ensureValidToken()
  if (!token) throw new Error('No hay cuenta Google conectada')
  return { Authorization: `Bearer ${token}` }
}

async function findFileId(name: string): Promise<string | null> {
  const headers = await authHeader()
  const q = encodeURIComponent(`name = '${name}' and trashed = false`)
  const res = await fetch(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)`, { headers })
  if (!res.ok) throw new Error(`drive list error ${res.status}`)
  const data = await res.json()
  return data.files?.[0]?.id ?? null
}

const driveApi = {
  async uploadFile(name: string, content: string): Promise<void> {
    const headers = await authHeader()
    const existingId = await findFileId(name)
    const metadata = existingId ? {} : { name, parents: ['appDataFolder'] }
    const body =
      `--${BOUNDARY}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${BOUNDARY}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${BOUNDARY}--`

    const url = existingId
      ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart`
      : `${UPLOAD_API}/files?uploadType=multipart`
    const res = await fetch(url, {
      method: existingId ? 'PATCH' : 'POST',
      headers: { ...headers, 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
      body,
    })
    if (!res.ok) throw new Error(`drive upload error ${res.status}`)
  },

  async listFiles(namePrefix: string): Promise<Array<{ id: string; name: string }>> {
    const headers = await authHeader()
    const q = encodeURIComponent(`name contains '${namePrefix}' and trashed = false`)
    const res = await fetch(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id,name)&pageSize=1000`, { headers })
    if (!res.ok) throw new Error(`drive list error ${res.status}`)
    const data = await res.json()
    return data.files ?? []
  },

  async downloadFile(fileId: string): Promise<string> {
    const headers = await authHeader()
    const res = await fetch(`${API}/files/${fileId}?alt=media`, { headers })
    if (!res.ok) throw new Error(`drive download error ${res.status}`)
    return res.text()
  },

  async deleteFile(name: string): Promise<void> {
    const headers = await authHeader()
    const existingId = await findFileId(name)
    if (!existingId) return
    const res = await fetch(`${API}/files/${existingId}`, { method: 'DELETE', headers })
    if (!res.ok && res.status !== 404) throw new Error(`drive delete error ${res.status}`)
  },

  // Devuelve el contenido del archivo por nombre, o null si no existe en Drive.
  async getFileByName(name: string): Promise<string | null> {
    const id = await findFileId(name)
    if (!id) return null
    return driveApi.downloadFile(id)
  },
}

async function persistQueue(): Promise<void> {
  await writeJson(PENDING_QUEUE_FILE, useDriveStore.getState().pendingUploads).catch(() => {})
}

async function persistDeletes(): Promise<void> {
  await writeJson(PENDING_DELETES_FILE, [...pendingDeletes]).catch(() => {})
}

async function flushDeletes(): Promise<void> {
  if (!useDriveStore.getState().account) return
  for (const id of [...pendingDeletes]) {
    try {
      await driveApi.deleteFile(trainingFileName(id))
      pendingDeletes.delete(id)
    } catch {
      // se reintenta en el próximo retryPending/downloadAll
    }
  }
  await persistDeletes()
}

export async function loadPendingQueue(): Promise<void> {
  try {
    const raw = await FileSystem.readAsStringAsync(PENDING_QUEUE_FILE)
    const uploads: PendingUpload[] = JSON.parse(raw)
    useDriveStore.getState().setPendingUploads(uploads)
    if (uploads.length > 0) useDriveStore.getState().setSyncStatus('pending')
  } catch {
    // sin cola pendiente previa
  }
  try {
    pendingDeletes = new Set(JSON.parse(await FileSystem.readAsStringAsync(PENDING_DELETES_FILE)))
  } catch {
    // sin borrados pendientes
  }
}

export async function uploadTraining(training: Training): Promise<void> {
  const store = useDriveStore.getState()
  if (!store.account) return
  store.setSyncStatus('syncing')
  try {
    await driveApi.uploadFile(trainingFileName(training.id), JSON.stringify(training))
    store.removePending(training.id)
    await persistQueue()
    store.setSyncStatus(useDriveStore.getState().pendingUploads.length > 0 ? 'pending' : 'idle')
  } catch {
    const existing = useDriveStore.getState().pendingUploads.find((p) => p.trainingId === training.id)
    store.addPending({
      trainingId: training.id,
      retries: existing ? existing.retries + 1 : 0,
      lastAttempt: Date.now(),
    })
    await persistQueue()
    store.setSyncStatus('pending')
  }
}

// Se llama siempre al borrar en local, haya cuenta o no: queda anotado y se borra en Drive
// en cuanto se pueda.
export async function deleteFromDrive(trainingId: string): Promise<void> {
  pendingDeletes.add(trainingId)
  useDriveStore.getState().removePending(trainingId)
  await Promise.all([persistDeletes(), persistQueue()])
  await flushDeletes()
}

// Reconciliación inicial en ambos sentidos: descarga de Drive lo que falte en local (sin
// sobreescribir nunca una sesión local existente) y sube a Drive las sesiones locales que
// aún no existan ahí (ej. sesiones creadas antes de conectar la cuenta por primera vez).
export async function downloadAll(): Promise<void> {
  const store = useDriveStore.getState()
  if (!store.account) return
  store.setSyncStatus('syncing')
  try {
    const files = await driveApi.listFiles('training_')
    const remoteIds = new Set(files.map((f) => f.name.replace('training_', '').replace('.json', '')))
    const localTrainings = useTrainingStore.getState().trainings
    const localIds = new Set(localTrainings.map((t) => t.id))

    await flushDeletes()

    for (const file of files) {
      const trainingId = file.name.replace('training_', '').replace('.json', '')
      if (localIds.has(trainingId) || pendingDeletes.has(trainingId)) continue
      try {
        const training: Training = JSON.parse(await driveApi.downloadFile(file.id))
        await storage.saveTraining(training)
        useTrainingStore.getState().addTrainingLocal(training)
      } catch {
        // archivo corrupto o fallo puntual: se salta y se reintenta en la próxima reconciliación
      }
    }

    for (const training of localTrainings) {
      if (!remoteIds.has(training.id)) await uploadTraining(training)
    }

    store.setSyncStatus(useDriveStore.getState().pendingUploads.length > 0 ? 'pending' : 'idle')
  } catch {
    store.setSyncStatus('error')
  }
}

// Reintenta la cola de pendientes respetando el backoff exponencial (5s, 10s, 20s).
// force=true (botón "Sincronizar ahora") ignora el backoff y el tope de reintentos.
export async function retryPending(force = false): Promise<void> {
  const { pendingUploads, account } = useDriveStore.getState()
  if (!account) return
  await flushDeletes()
  if (pendingUploads.length === 0) return

  for (const pending of [...pendingUploads]) {
    if (!force) {
      if (pending.retries >= MAX_RETRIES) continue
      const waitMs = Math.pow(2, pending.retries) * 5000
      if (Date.now() - pending.lastAttempt < waitMs) continue
    }
    const training = useTrainingStore.getState().trainings.find((t) => t.id === pending.trainingId)
    if (training) await uploadTraining(training)
    else useDriveStore.getState().removePending(pending.trainingId) // sesión ya no existe localmente
  }
  await persistQueue()
}

// Cuenta sesiones y perfiles respaldados en Drive (bajo demanda, para verificación visual en UI).
export async function getRemoteCounts(): Promise<{ trainings: number; profiles: number }> {
  const [trainingFiles, profilesJson] = await Promise.all([
    driveApi.listFiles('training_'),
    driveApi.getFileByName(PROFILES_FILE_NAME),
  ])
  const profiles: CalibrationProfile[] = profilesJson ? JSON.parse(profilesJson) : []
  return { trainings: trainingFiles.length, profiles: profiles.length }
}

// Sube el array completo de perfiles (upsert de profiles.json). Silenciosa: sin cola de
// reintento ni feedback en UI — si falla, se reintentará en la próxima mutación de perfil.
export async function uploadProfiles(profiles: CalibrationProfile[]): Promise<void> {
  if (!useDriveStore.getState().account) return
  try {
    await driveApi.uploadFile(PROFILES_FILE_NAME, JSON.stringify(profiles))
  } catch {
    // silenciosa por diseño (ver spec HT-004-c)
  }
}

// Merge por profile.id: une perfiles de ambas versiones; en caso de mismo id, gana Drive.
export function mergeProfiles(local: CalibrationProfile[], remote: CalibrationProfile[]): CalibrationProfile[] {
  const merged = new Map<string, CalibrationProfile>()
  for (const p of local) merged.set(p.id, p)
  for (const p of remote) merged.set(p.id, p)
  return Array.from(merged.values()).sort((a, b) => a.createdAt - b.createdAt)
}

// Llamado tras conectar la cuenta (después de HT-004-a connect()). Compara local vs Drive:
// - Drive vacío → sube local
// - Local vacío → baja Drive directamente
// - Idénticos → no hace nada
// - Distintos → deja el conflicto en driveStore para que la UI muestre el diálogo
export async function syncProfilesOnConnect(localProfiles: CalibrationProfile[]): Promise<void> {
  if (!useDriveStore.getState().account) return
  let remoteJson: string | null
  try {
    remoteJson = await driveApi.getFileByName(PROFILES_FILE_NAME)
  } catch {
    return // sin conexión a Drive; se reintentará en la próxima mutación de perfil
  }

  if (!remoteJson) {
    await uploadProfiles(localProfiles)
    return
  }

  // El store siempre tiene al menos el perfil Default: si solo hay ese, es una instalación
  // nueva y no tiene sentido preguntar por conflicto.
  if (localProfiles.every((p) => p.id === DEFAULT_PROFILE.id)) {
    const remoteProfiles: CalibrationProfile[] = JSON.parse(remoteJson)
    useProfileStore.getState().setProfiles(remoteProfiles)
    await storage.saveProfiles(remoteProfiles)
    return
  }

  const remoteProfiles: CalibrationProfile[] = JSON.parse(remoteJson)
  if (JSON.stringify(localProfiles) === JSON.stringify(remoteProfiles)) return

  useDriveStore.getState().setProfileConflict({ local: localProfiles, remote: remoteProfiles })
}

export type ProfileConflictResolution = 'use-drive' | 'use-local' | 'merge'

// Aplica la decisión del usuario en el modal de conflicto: guarda en local y sube a Drive.
export async function resolveProfileConflict(
  conflict: ProfileConflict,
  resolution: ProfileConflictResolution
): Promise<void> {
  const resolved =
    resolution === 'use-drive' ? conflict.remote
    : resolution === 'use-local' ? conflict.local
    : mergeProfiles(conflict.local, conflict.remote)

  useProfileStore.getState().setProfiles(resolved)
  await storage.saveProfiles(resolved)
  useDriveStore.getState().setProfileConflict(null)
  await uploadProfiles(resolved)
}

let netInfoUnsubscribe: (() => void) | null = null

// Llamar una vez al arrancar la app: carga la cola pendiente y reintenta al recuperar red.
export function initDriveSync(): void {
  if (netInfoUnsubscribe) return
  netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) retryPending()
  })
}
