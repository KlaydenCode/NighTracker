import { describe, expect, it } from 'vitest'
import { visibleHeightStyle } from './viewport'

describe('visibleHeightStyle', () => {
  it('suit la hauteur mesurée', () => {
    expect(visibleHeightStyle(420)).toEqual({ height: '420px' })
    expect(visibleHeightStyle(420, 'minHeight')).toEqual({ minHeight: '420px' })
  })

  it('se replie sur 100dvh avant la mesure', () => {
    expect(visibleHeightStyle(null)).toEqual({ height: '100dvh' })
    expect(visibleHeightStyle(null, 'minHeight')).toEqual({ minHeight: '100dvh' })
  })
})
