import { describe, expect, it } from 'vitest'
import {
  validateBirthDate,
  validateDisplayName,
  validateEmail,
  validateFirstName,
  validateHouseholdName,
  validateRole,
} from './validation'

describe('validateFirstName', () => {
  it('accepte 1 à 50 caractères', () => {
    expect(validateFirstName('Léa')).toBeNull()
    expect(validateFirstName('a'.repeat(50))).toBeNull()
  })

  it('refuse le vide, les espaces seuls et plus de 50 caractères', () => {
    expect(validateFirstName('')).toBe('Le prénom est obligatoire.')
    expect(validateFirstName('   ')).toBe('Le prénom est obligatoire.')
    expect(validateFirstName('a'.repeat(51))).toBe('50 caractères maximum.')
  })

  it('ignore les espaces aux extrémités', () => {
    expect(validateFirstName(` ${'a'.repeat(50)} `)).toBeNull()
  })
})

describe('validateHouseholdName', () => {
  it('applique les mêmes bornes que le prénom', () => {
    expect(validateHouseholdName('Foyer de Léa')).toBeNull()
    expect(validateHouseholdName(' ')).toBe('Le nom du foyer est obligatoire.')
    expect(validateHouseholdName('a'.repeat(51))).toBe('50 caractères maximum.')
  })
})

describe('validateDisplayName', () => {
  it('accepte 1 à 30 caractères', () => {
    expect(validateDisplayName('Maman')).toBeNull()
    expect(validateDisplayName('a'.repeat(30))).toBeNull()
  })

  it('refuse le vide et plus de 30 caractères', () => {
    expect(validateDisplayName('')).toBe('Le nom d\'affichage est obligatoire.')
    expect(validateDisplayName('a'.repeat(31))).toBe('30 caractères maximum.')
  })
})

describe('validateBirthDate', () => {
  const today = '2026-09-15'

  it('accepte aujourd\'hui et le passé', () => {
    expect(validateBirthDate('2026-09-15', today)).toBeNull()
    expect(validateBirthDate('2025-03-15', today)).toBeNull()
  })

  it('refuse le vide, une date mal formée ou impossible, et le lendemain', () => {
    expect(validateBirthDate('', today)).toBe('La date de naissance est obligatoire.')
    expect(validateBirthDate('15/03/2025', today)).toBe('Date invalide.')
    expect(validateBirthDate('2025-02-30', today)).toBe('Date invalide.')
    expect(validateBirthDate('2026-09-16', today)).toBe('La date ne peut pas être dans le futur.')
  })
})

describe('validateRole', () => {
  it('accepte maman et papa', () => {
    expect(validateRole('maman')).toBeNull()
    expect(validateRole('papa')).toBeNull()
  })

  it('refuse null, vide et autre', () => {
    expect(validateRole(null)).toBe('Choisissez votre rôle.')
    expect(validateRole('')).toBe('Choisissez votre rôle.')
    expect(validateRole('autre')).toBe('Choisissez votre rôle.')
  })
})

describe('validateEmail', () => {
  it('valide la forme de l\'adresse', () => {
    expect(validateEmail(' Papa@Exemple.test ')).toBeNull()
    expect(validateEmail('papa')).toBe('Adresse email invalide')
  })
})
