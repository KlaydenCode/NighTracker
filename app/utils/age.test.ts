import { describe, expect, it } from 'vitest'
import { ageInMonths, formatAge, todayInParis } from './age'

describe('todayInParis', () => {
  it('donne le lendemain UTC en été après 22 h UTC (UTC+2)', () => {
    expect(todayInParis(new Date('2026-09-14T22:30:00Z'))).toBe('2026-09-15')
    expect(todayInParis(new Date('2026-09-14T21:59:00Z'))).toBe('2026-09-14')
  })

  it('donne le lendemain UTC en hiver après 23 h UTC (UTC+1)', () => {
    expect(todayInParis(new Date('2026-01-14T23:30:00Z'))).toBe('2026-01-15')
    expect(todayInParis(new Date('2026-01-14T22:59:00Z'))).toBe('2026-01-14')
  })
})

describe('ageInMonths', () => {
  it('compte les mois révolus', () => {
    expect(ageInMonths('2025-03-15', '2026-09-15')).toBe(18)
    expect(ageInMonths('2025-03-15', '2026-09-14')).toBe(17)
  })

  it('gère la fin de mois : né le 31 janvier', () => {
    expect(ageInMonths('2026-01-31', '2026-02-27')).toBe(0)
    expect(ageInMonths('2026-01-31', '2026-02-28')).toBe(1)
    expect(ageInMonths('2026-01-31', '2026-03-01')).toBe(1)
    expect(ageInMonths('2026-01-31', '2026-03-31')).toBe(2)
  })

  it('gère l\'année bissextile', () => {
    expect(ageInMonths('2024-01-31', '2024-02-28')).toBe(0)
    expect(ageInMonths('2024-01-31', '2024-02-29')).toBe(1)
    expect(ageInMonths('2024-02-29', '2025-02-27')).toBe(11)
    expect(ageInMonths('2024-02-29', '2025-02-28')).toBe(12)
  })
})

describe('formatAge', () => {
  it('donne les exemples de la fiche', () => {
    expect(formatAge('2025-03-15', '2026-09-15')).toBe('18 mois')
    expect(formatAge('2025-03-15', '2026-09-14')).toBe('17 mois')
  })

  it('« Moins d\'un mois » à 0', () => {
    expect(formatAge('2026-09-15', '2026-09-15')).toBe('Moins d\'un mois')
    expect(formatAge('2026-08-16', '2026-09-15')).toBe('Moins d\'un mois')
  })

  it('compte en mois jusqu\'à 23', () => {
    expect(formatAge('2026-08-15', '2026-09-15')).toBe('1 mois')
    expect(formatAge('2024-10-15', '2026-09-15')).toBe('23 mois')
  })

  it('passe aux années à 24 mois', () => {
    expect(formatAge('2024-09-15', '2026-09-15')).toBe('2 ans')
    expect(formatAge('2024-02-15', '2026-09-15')).toBe('2 ans et 7 mois')
  })

  it('renvoie une chaîne vide pour une date future', () => {
    expect(formatAge('2026-09-16', '2026-09-15')).toBe('')
  })
})
