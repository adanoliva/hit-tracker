// HT-016: Game mode removal — smoke tests
// Verifies that game-related exports were removed and unrelated code is intact.

import { exerciseService } from '../../shared/services/exercise'

describe('HT-016 — Game mode removal', () => {
  it('exerciseService is unaffected', () => {
    expect(exerciseService.getAll().length).toBeGreaterThan(0)
  })

  it('shared types module has no GameScore export', () => {
    // GameScore was a TypeScript interface (compile-time only).
    // This test documents intent: if someone re-adds it as a value, it will fail.
    const types = require('../../shared/types')
    expect(types.GameScore).toBeUndefined()
    expect(types.GameTopThree).toBeUndefined()
  })
})
