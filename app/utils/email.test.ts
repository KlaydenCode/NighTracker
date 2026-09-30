import { describe, expect, it } from 'vitest'
import { isValidEmail, normalizeEmail } from './email'

describe('normalizeEmail', () => {
  it('retire les espaces et passe en minuscules', () => {
    expect(normalizeEmail(' Papa@Exemple.FR ')).toBe('papa@exemple.fr')
  })
})

describe('isValidEmail', () => {
  it('accepte une adresse correcte, même avec espaces et majuscules', () => {
    expect(isValidEmail('papa@exemple.test')).toBe(true)
    expect(isValidEmail(' Papa@Exemple.FR ')).toBe(true)
  })

  it.each(['', 'papa', 'papa@', 'papa@exemple', '@exemple.fr', 'pa pa@exemple.fr', 'a@b@c.fr'])('refuse « %s »', (value) => {
    expect(isValidEmail(value)).toBe(false)
  })

  it('refuse plus de 254 caractères', () => {
    const long = `${'a'.repeat(250)}@b.fr`
    expect(long.length).toBeGreaterThan(254)
    expect(isValidEmail(long)).toBe(false)
    expect(isValidEmail(`${'a'.repeat(244)}@b.fr`)).toBe(true)
  })
})
