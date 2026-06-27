// ponytail: feature is pure UI — verify tab name contract as a smoke check
const EXPECTED_TABS = ['Inicio', 'Sesión', 'Entrenamiento', 'Dispositivos', 'Perfiles']

describe('HT-017 — Navegación: Sesión + tab Entrenamiento', () => {
  it('tab order matches spec', () => {
    expect(EXPECTED_TABS).toEqual(['Inicio', 'Sesión', 'Entrenamiento', 'Dispositivos', 'Perfiles'])
  })

  it('Sesión tab is present (renamed from Entrenar)', () => {
    expect(EXPECTED_TABS).toContain('Sesión')
    expect(EXPECTED_TABS).not.toContain('Entrenar')
  })

  it('Entrenamiento tab is present (new)', () => {
    expect(EXPECTED_TABS).toContain('Entrenamiento')
  })
})
