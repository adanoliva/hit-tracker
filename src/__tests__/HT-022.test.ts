// Lógica pura extraída de useSensorData.ts: decaimiento exponencial del dynamicFloor
const COOLDOWN_BASE_MS = 200
const COOLDOWN_DAMPING = 0.3
const FLOOR_RECOVERY_FRACTION = 0.05

function effectiveRebound(profileRebound: number | undefined, lastPeakMag: number): number {
  return profileRebound ?? (COOLDOWN_BASE_MS + lastPeakMag * COOLDOWN_DAMPING)
}

function decayFloor(floor: number, base: number, rebound: number, deltaMs: number): number {
  const lambda = -Math.log(FLOOR_RECOVERY_FRACTION) / rebound
  return base + (floor - base) * Math.exp(-lambda * deltaMs)
}

describe('HT-022 — Decaimiento exponencial del dynamicFloor', () => {
  describe('lambda derivado de rebound calibrado', () => {
    it('recupera ~95% del camino hacia base transcurrido effectiveRebound ms', () => {
      const base = 150
      const peak = 1000
      const rebound = 400
      const floorAfterHit = Math.max(base, peak * 0.4) // 400

      const decayed = decayFloor(floorAfterHit, base, rebound, rebound)
      const totalDrop = floorAfterHit - base
      const remaining = decayed - base

      expect(remaining / totalDrop).toBeCloseTo(0.05, 2)
    })

    it('usa el fallback dinámico si el perfil no tiene rebound calibrado', () => {
      const lastPeakMag = 665
      const rebound = effectiveRebound(undefined, lastPeakMag)
      expect(rebound).toBeCloseTo(200 + 665 * 0.3, 5)
    })

    it('usa profile.rebound calibrado cuando existe, ignorando el fallback', () => {
      const rebound = effectiveRebound(350, 665)
      expect(rebound).toBe(350)
    })
  })

  describe('nunca decae por debajo de base', () => {
    it('converge hacia base sin cruzarlo, incluso con deltas grandes', () => {
      const base = 150
      const decayed = decayFloor(1000, base, 400, 100000)
      expect(decayed).toBeGreaterThanOrEqual(base)
      expect(decayed).toBeCloseTo(base, 1)
    })
  })

  describe('caso límite señalado en la spec: floor muy cerca de base tras varias vidas medias', () => {
    it('prevMag > dynamicFloor sigue evaluando correctamente aunque la diferencia sea mínima', () => {
      const base = 150
      const rebound = 400
      // ~5 vidas medias de recuperación al 95% -> floor prácticamente en base pero no exactamente igual
      const floorAfterManyLives = decayFloor(1000, base, rebound, rebound * 5)

      expect(floorAfterManyLives).toBeGreaterThan(base) // nunca llega exactamente a base
      expect(floorAfterManyLives - base).toBeLessThan(0.01) // pero la diferencia es despreciable

      // Un golpe ligero justo por encima de base debe seguir contando como pico
      expect(base + 1 > floorAfterManyLives).toBe(true)
      // Un "golpe" que solo iguala base (ruido, no golpe real) no debe contar
      expect(base > floorAfterManyLives).toBe(false)
    })
  })

  describe('deltas pequeños (jitter de BLE)', () => {
    it('el floor decae monótonamente hacia base incluso con Δt de 1ms en 1ms', () => {
      const base = 150
      const rebound = 400
      let floor = Math.max(base, 1000 * 0.4) // 400

      for (let i = 0; i < 50; i++) {
        const next = decayFloor(floor, base, rebound, 1)
        expect(next).toBeLessThanOrEqual(floor)
        expect(next).toBeGreaterThanOrEqual(base)
        floor = next
      }
    })
  })

  describe('combo golpe fuerte + golpe ligero (caso límite del riesgo de QA)', () => {
    it('un golpe fuerte seguido de uno normal a ~150-200ms se detecta (floor decae lo bastante rápido)', () => {
      const base = 150
      const rebound = 400 // calibrado, ej. jab normal
      const strongPeakMag = 1500
      const floorAfterStrongHit = Math.max(base, strongPeakMag * 0.4) // 600

      const floorAt180ms = decayFloor(floorAfterStrongHit, base, rebound, 180)
      const normalHitMag = 700

      // Con el decaimiento lineal previo (0.5 raw/ms), floor a 180ms sería 600 - 90 = 510,
      // y el golpe normal (700) también lo superaría — pero el exponencial baja más rápido
      // al principio, dejando más margen para golpes aún más ligeros en el mismo combo.
      expect(floorAt180ms).toBeLessThan(normalHitMag)
    })
  })
})
