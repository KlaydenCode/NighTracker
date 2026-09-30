import { describe, expect, it } from 'vitest'
import { remainingSeconds } from './cooldown'

const sentAt = 1_000_000

describe('remainingSeconds', () => {
  it('vaut 60 à l\'envoi', () => {
    expect(remainingSeconds(sentAt, sentAt)).toBe(60)
  })

  it('décroît de 1 à 59 secondes', () => {
    expect(remainingSeconds(sentAt, sentAt + 1000)).toBe(59)
    expect(remainingSeconds(sentAt, sentAt + 30_500)).toBe(30)
    expect(remainingSeconds(sentAt, sentAt + 59_000)).toBe(1)
    expect(remainingSeconds(sentAt, sentAt + 59_999)).toBe(1)
  })

  it('vaut 0 à 60 secondes et au-delà, jamais négatif', () => {
    expect(remainingSeconds(sentAt, sentAt + 60_000)).toBe(0)
    expect(remainingSeconds(sentAt, sentAt + 600_000)).toBe(0)
  })

  it('accepte une autre durée', () => {
    expect(remainingSeconds(sentAt, sentAt, 10)).toBe(10)
  })
})
