// Reimplementa la lógica pura de src/services/driveSync.ts (no se importa directamente: el
// módulo real importa NetInfo/expo-file-system, con bindings nativos no disponibles en el
// entorno de test — mismo patrón que HT-004-a.test.ts / HT-023.test.ts).

interface PendingUpload {
  trainingId: string
  retries: number
  lastAttempt: number
}

const MAX_RETRIES = 3

function waitMsForRetry(retries: number): number {
  return Math.pow(2, retries) * 5000
}

function shouldAttemptNow(pending: PendingUpload, now: number, force: boolean): boolean {
  if (force) return true
  if (pending.retries >= MAX_RETRIES) return false
  return now - pending.lastAttempt >= waitMsForRetry(pending.retries)
}

// Réplica de driveStore.addPending: reemplaza la entrada existente para el mismo trainingId
// (usado tras un fallo de subida — bump de retries).
function addOrBumpPending(queue: PendingUpload[], trainingId: string, now: number): PendingUpload[] {
  const existing = queue.find((p) => p.trainingId === trainingId)
  const next: PendingUpload = { trainingId, retries: existing ? existing.retries + 1 : 0, lastAttempt: now }
  return [...queue.filter((p) => p.trainingId !== trainingId), next]
}

function removePending(queue: PendingUpload[], trainingId: string): PendingUpload[] {
  return queue.filter((p) => p.trainingId !== trainingId)
}

function nextSyncStatus(pendingCount: number): 'idle' | 'pending' {
  return pendingCount > 0 ? 'pending' : 'idle'
}

// Réplica de downloadAll(): solo descarga ids que no existen localmente.
function filesToDownload(remoteNames: string[], localIds: Set<string>): string[] {
  return remoteNames
    .map((name) => name.replace('training_', '').replace('.json', ''))
    .filter((id) => !localIds.has(id))
}

// Réplica de la mitad "subida" de downloadAll(): sube los locales que aún no existan en
// Drive — cubre sesiones creadas antes de conectar la cuenta por primera vez.
function localIdsToUpload(localIds: string[], remoteNames: string[]): string[] {
  const remoteIds = new Set(remoteNames.map((name) => name.replace('training_', '').replace('.json', '')))
  return localIds.filter((id) => !remoteIds.has(id))
}

describe('HT-004-b — Sincronización automática de sesiones con Google Drive', () => {
  describe('subida automática al terminar sesión', () => {
    it('subida exitosa limpia la cola y el estado queda idle', () => {
      const queueAfterUpload = removePending([{ trainingId: 't1', retries: 0, lastAttempt: 1000 }], 't1')
      expect(queueAfterUpload).toEqual([])
      expect(nextSyncStatus(queueAfterUpload.length)).toBe('idle')
    })

    it('fallo de red durante subida encola el training con retries=0', () => {
      const queue = addOrBumpPending([], 't1', 5000)
      expect(queue).toEqual([{ trainingId: 't1', retries: 0, lastAttempt: 5000 }])
      expect(nextSyncStatus(queue.length)).toBe('pending')
    })

    it('un segundo fallo del mismo training incrementa retries en vez de duplicar la entrada', () => {
      const afterFirst = addOrBumpPending([], 't1', 1000)
      const afterSecond = addOrBumpPending(afterFirst, 't1', 6000)
      expect(afterSecond).toEqual([{ trainingId: 't1', retries: 1, lastAttempt: 6000 }])
    })
  })

  describe('descarga inicial no sobreescribe sesiones locales', () => {
    it('solo descarga los ids que no existen en local', () => {
      const localIds = new Set(['abc'])
      const remoteNames = ['training_abc.json', 'training_xyz.json']
      expect(filesToDownload(remoteNames, localIds)).toEqual(['xyz'])
    })

    it('drive vacío no descarga nada', () => {
      expect(filesToDownload([], new Set(['abc']))).toEqual([])
    })

    it('local vacío descarga todo lo que hay en drive', () => {
      const remoteNames = ['training_a.json', 'training_b.json']
      expect(filesToDownload(remoteNames, new Set())).toEqual(['a', 'b'])
    })
  })

  describe('reconciliación al conectar: sube también las sesiones locales que faltan en Drive', () => {
    it('sube las sesiones locales que no existen en Drive (creadas antes de conectar la cuenta)', () => {
      const localIds = ['abc', 'xyz']
      const remoteNames = ['training_abc.json'] // solo "abc" ya estaba en Drive
      expect(localIdsToUpload(localIds, remoteNames)).toEqual(['xyz'])
    })

    it('drive ya tiene todo: no sube nada', () => {
      const localIds = ['abc']
      const remoteNames = ['training_abc.json']
      expect(localIdsToUpload(localIds, remoteNames)).toEqual([])
    })

    it('drive vacío (primera conexión con historial local): sube todo lo local', () => {
      const localIds = ['a', 'b']
      expect(localIdsToUpload(localIds, [])).toEqual(['a', 'b'])
    })
  })

  describe('backoff exponencial de reintentos', () => {
    it('retries=0 espera 5000ms', () => {
      expect(waitMsForRetry(0)).toBe(5000)
    })

    it('retries=1 espera 10000ms', () => {
      expect(waitMsForRetry(1)).toBe(10000)
    })

    it('retries=2 espera 20000ms', () => {
      expect(waitMsForRetry(2)).toBe(20000)
    })

    it('no reintenta si aún no ha pasado el tiempo de espera', () => {
      const pending: PendingUpload = { trainingId: 't1', retries: 1, lastAttempt: 10_000 }
      const now = 10_000 + 3_000 // esperado: 10000ms, solo han pasado 3000ms
      expect(shouldAttemptNow(pending, now, false)).toBe(false)
    })

    it('reintenta una vez pasado el tiempo de espera', () => {
      const pending: PendingUpload = { trainingId: 't1', retries: 1, lastAttempt: 10_000 }
      const now = 10_000 + 10_000
      expect(shouldAttemptNow(pending, now, false)).toBe(true)
    })

    it('no reintenta automáticamente tras agotar el máximo de reintentos', () => {
      const pending: PendingUpload = { trainingId: 't1', retries: MAX_RETRIES, lastAttempt: 0 }
      expect(shouldAttemptNow(pending, 999_999_999, false)).toBe(false)
    })

    it('"Sincronizar ahora" (force=true) ignora el backoff y el tope de reintentos', () => {
      const pending: PendingUpload = { trainingId: 't1', retries: MAX_RETRIES, lastAttempt: Date.now() }
      expect(shouldAttemptNow(pending, Date.now(), true)).toBe(true)
    })
  })

  describe('eliminar sesión también la elimina de la cola de pendientes', () => {
    it('borra la entrada pendiente correspondiente al training eliminado', () => {
      const queue: PendingUpload[] = [
        { trainingId: 't1', retries: 0, lastAttempt: 0 },
        { trainingId: 't2', retries: 1, lastAttempt: 0 },
      ]
      expect(removePending(queue, 't1')).toEqual([{ trainingId: 't2', retries: 1, lastAttempt: 0 }])
    })
  })
})
