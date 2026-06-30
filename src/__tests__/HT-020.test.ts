import type { BoxingRoundScript } from '../../shared/types'

// Replicates the combo visibility guard from TrainingRound.tsx
function shouldShowCombo(combo: string | undefined): boolean {
  return !!combo && combo.trim().length > 0
}

// Replicates the combo lookup from PlanRunner.tsx
function resolveCombo(roundScripts: BoxingRoundScript[], currentRound: number): string | undefined {
  return roundScripts.find((s) => s.round === currentRound)?.combo
}

describe('HT-020 — Guía de combo en TrainingRound', () => {
  describe('shouldShowCombo — visibilidad del banner', () => {
    it('combo con texto → muestra banner', () => {
      expect(shouldShowCombo('1-2-3-Slip Iz')).toBe(true)
    })

    it('combo undefined → no muestra banner', () => {
      expect(shouldShowCombo(undefined)).toBe(false)
    })

    it('combo vacío "" → no muestra banner', () => {
      expect(shouldShowCombo('')).toBe(false)
    })

    it('combo solo espacios → no muestra banner', () => {
      expect(shouldShowCombo('   ')).toBe(false)
    })

    it('combo largo → muestra banner (sin restricción de longitud)', () => {
      const long = '1-2-3-Slip Iz-3b-6-Step-1-2-1b-2b-Duck-Pivot-6-5'
      expect(shouldShowCombo(long)).toBe(true)
    })
  })

  describe('resolveCombo — obtener combo del round activo', () => {
    const scripts: BoxingRoundScript[] = [
      { round: 1, combo: '1-2-3' },
      { round: 3, combo: '1-2-Slip Iz-3b' },
    ]

    it('round con script → devuelve combo', () => {
      expect(resolveCombo(scripts, 1)).toBe('1-2-3')
      expect(resolveCombo(scripts, 3)).toBe('1-2-Slip Iz-3b')
    })

    it('round sin script → devuelve undefined', () => {
      expect(resolveCombo(scripts, 2)).toBeUndefined()
    })

    it('lista vacía → siempre undefined', () => {
      expect(resolveCombo([], 1)).toBeUndefined()
    })

    it('round 0 (idle/antes de iniciar) → undefined', () => {
      expect(resolveCombo(scripts, 0)).toBeUndefined()
    })
  })
})
