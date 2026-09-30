import { describe, expect, it } from 'vitest'
import { formatDateFr, roleLabel } from './format'

describe('roleLabel', () => {
  it('met la majuscule aux rôles connus', () => {
    expect(roleLabel('maman')).toBe('Maman')
    expect(roleLabel('papa')).toBe('Papa')
    expect(roleLabel('autre')).toBe('Autre')
  })

  it('renvoie la valeur telle quelle pour un rôle inconnu', () => {
    expect(roleLabel('x')).toBe('x')
  })
})

describe('formatDateFr', () => {
  it('formate une date seule sans décalage de fuseau', () => {
    expect(formatDateFr('2025-03-15')).toBe('15 mars 2025')
    expect(formatDateFr('2025-01-01')).toBe('1 janvier 2025')
  })

  it('convertit un horodatage à Europe/Paris', () => {
    expect(formatDateFr('2026-09-14T22:30:00Z')).toBe('15 septembre 2026')
  })

  it('renvoie une chaîne vide pour une valeur illisible', () => {
    expect(formatDateFr('pas une date')).toBe('')
  })
})
