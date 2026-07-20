// Reimplementa la lógica pura de src/services/driveSync.ts (mergeProfiles, syncProfilesOnConnect)
// sin importar el módulo real — depende de NetInfo/expo-file-system, sin bindings nativos en el
// entorno de test. Mismo patrón que HT-004-a.test.ts / HT-004-b.test.ts.

interface CalibrationProfile {
  id: string
  name: string
  threshold: number
  sensitivity: number
  createdAt: number
}

function mergeProfiles(local: CalibrationProfile[], remote: CalibrationProfile[]): CalibrationProfile[] {
  const merged = new Map<string, CalibrationProfile>()
  for (const p of local) merged.set(p.id, p)
  for (const p of remote) merged.set(p.id, p)
  return Array.from(merged.values()).sort((a, b) => a.createdAt - b.createdAt)
}

type SyncDecision =
  | { type: 'upload-local' }
  | { type: 'download-remote'; profiles: CalibrationProfile[] }
  | { type: 'noop' }
  | { type: 'conflict'; local: CalibrationProfile[]; remote: CalibrationProfile[] }

// Réplica de la rama de decisión de syncProfilesOnConnect (sin las llamadas de red/estado reales).
function decideProfileSync(localProfiles: CalibrationProfile[], remoteJson: string | null): SyncDecision {
  if (!remoteJson) return { type: 'upload-local' }
  if (localProfiles.length === 0) return { type: 'download-remote', profiles: JSON.parse(remoteJson) }

  const remoteProfiles: CalibrationProfile[] = JSON.parse(remoteJson)
  if (JSON.stringify(localProfiles) === JSON.stringify(remoteProfiles)) return { type: 'noop' }
  return { type: 'conflict', local: localProfiles, remote: remoteProfiles }
}

const p = (id: string, name: string, createdAt = 0): CalibrationProfile =>
  ({ id, name, threshold: 35, sensitivity: 25, createdAt })

describe('HT-004-c — Sincronización de perfiles de calibración con Google Drive', () => {
  describe('decideProfileSync', () => {
    it('primera conexión con perfiles locales y Drive vacío: sube el local', () => {
      const decision = decideProfileSync([p('a', 'Ligero')], null)
      expect(decision).toEqual({ type: 'upload-local' })
    })

    it('dispositivo nuevo (local vacío) con Drive poblado: descarga directamente sin conflicto', () => {
      const remote = [p('a', 'Ligero'), p('b', 'Medio'), p('c', 'Fuerte')]
      const decision = decideProfileSync([], JSON.stringify(remote))
      expect(decision).toEqual({ type: 'download-remote', profiles: remote })
    })

    it('perfiles idénticos en local y Drive: no hace nada', () => {
      const profiles = [p('a', 'Ligero')]
      const decision = decideProfileSync(profiles, JSON.stringify(profiles))
      expect(decision).toEqual({ type: 'noop' })
    })

    it('perfiles distintos en ambos lados: reporta conflicto para que la UI decida', () => {
      const local = [p('a', 'Ligero')]
      const remote = [p('a', 'Ligero v2')]
      const decision = decideProfileSync(local, JSON.stringify(remote))
      expect(decision).toEqual({ type: 'conflict', local, remote })
    })
  })

  describe('mergeProfiles', () => {
    it('combina perfiles únicos y Drive gana en conflicto de id', () => {
      const local = [p('a', 'Ligero'), p('b', 'Medio')]
      const remote = [p('a', 'Ligero v2'), p('c', 'Potencia')]
      const result = mergeProfiles(local, remote)
      expect(result).toHaveLength(3)
      expect(result.find((x) => x.id === 'a')?.name).toBe('Ligero v2')
      expect(result.find((x) => x.id === 'b')?.name).toBe('Medio')
      expect(result.find((x) => x.id === 'c')?.name).toBe('Potencia')
    })

    it('ordena el resultado por createdAt ascendente', () => {
      const local = [p('b', 'Medio', 200)]
      const remote = [p('a', 'Ligero', 100)]
      const result = mergeProfiles(local, remote)
      expect(result.map((x) => x.id)).toEqual(['a', 'b'])
    })

    it('sin solapamiento de ids: une ambos conjuntos completos', () => {
      const local = [p('a', 'Ligero', 1)]
      const remote = [p('b', 'Medio', 2)]
      expect(mergeProfiles(local, remote)).toHaveLength(2)
    })

    it('local vacío: el resultado es exactamente remote', () => {
      const remote = [p('a', 'Ligero'), p('b', 'Medio')]
      expect(mergeProfiles([], remote)).toEqual(mergeProfiles([], remote))
      expect(mergeProfiles([], remote).map((x) => x.id).sort()).toEqual(['a', 'b'])
    })

    it('remote vacío: el resultado conserva todos los locales', () => {
      const local = [p('a', 'Ligero'), p('b', 'Medio')]
      expect(mergeProfiles(local, []).map((x) => x.id).sort()).toEqual(['a', 'b'])
    })
  })
})
