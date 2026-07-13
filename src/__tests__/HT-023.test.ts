function shouldBeepOnRecord(magnitude: number, userHistoricMax: number): boolean {
  return userHistoricMax > 0 && magnitude > userHistoricMax
}

describe('HT-023 — Aviso sonoro al superar el máximo histórico', () => {
  it('no suena si no hay histórico (userHistoricMax === 0)', () => {
    expect(shouldBeepOnRecord(9999, 0)).toBe(false)
  })

  it('no suena si el golpe está por debajo del histórico', () => {
    expect(shouldBeepOnRecord(500, 800)).toBe(false)
  })

  it('no suena si el golpe iguala el histórico', () => {
    expect(shouldBeepOnRecord(800, 800)).toBe(false)
  })

  it('suena si el golpe supera el histórico', () => {
    expect(shouldBeepOnRecord(801, 800)).toBe(true)
  })

  it('sin cooldown: varios golpes consecutivos por encima del histórico disparan el aviso cada vez', () => {
    const magnitudes = [850, 900, 820]
    const results = magnitudes.map((m) => shouldBeepOnRecord(m, 800))
    expect(results).toEqual([true, true, true])
  })

  it('no suena con histórico negativo (estado inválido, tratado como sin histórico)', () => {
    expect(shouldBeepOnRecord(100, -1)).toBe(false)
  })
})
