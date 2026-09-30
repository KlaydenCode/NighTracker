import { describe, expect, it } from 'vitest'
import { errorMessage, errorToken, isNetworkError } from './supabase-errors'

const authRetryable = { name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 }
const postgrestNetwork = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' }

function sqlError(code: string, message: string) {
  return { code, message, details: null, hint: null }
}

describe('isNetworkError', () => {
  it('reconnaît l\'erreur Auth réessayable et l\'échec de fetch PostgREST', () => {
    expect(isNetworkError(authRetryable)).toBe(true)
    expect(isNetworkError(postgrestNetwork)).toBe(true)
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it.each([403, 422, 429])('n\'y voit pas une erreur Auth %i', (status) => {
    expect(isNetworkError({ name: 'AuthApiError', message: 'x', status, code: 'otp_expired' })).toBe(false)
  })

  it('n\'y voit pas une erreur de fonction SQL', () => {
    expect(isNetworkError(sqlError('P0001', 'already_member'))).toBe(false)
  })

  it('refuse ce qui n\'est pas un objet', () => {
    expect(isNetworkError(null)).toBe(false)
    expect(isNetworkError('erreur')).toBe(false)
  })
})

describe('errorToken', () => {
  it('renvoie network pour un échec réseau', () => {
    expect(errorToken(authRetryable)).toBe('network')
    expect(errorToken(postgrestNetwork)).toBe('network')
  })

  it('renvoie le message d\'une erreur P0001 connue', () => {
    const tokens = ['already_member', 'invitation_pending', 'invitation_not_found', 'role_reserved',
      'role_not_allowed', 'not_allowed', 'household_exists']
    for (const token of tokens) {
      expect(errorToken(sqlError('P0001', token))).toBe(token)
    }
  })

  it('renvoie unknown pour un jeton inconnu ou une autre erreur', () => {
    expect(errorToken(sqlError('P0001', 'autre_chose'))).toBe('unknown')
    expect(errorToken(sqlError('500', 'x'))).toBe('unknown')
    expect(errorToken(undefined)).toBe('unknown')
  })

  it('range refus de droit, ligne non touchée et contrainte de colonne', () => {
    expect(errorToken(sqlError('42501', 'x'))).toBe('not_allowed')
    expect(errorToken(sqlError('PGRST116', 'x'))).toBe('not_allowed')
    expect(errorToken(sqlError('23514', 'x'))).toBe('invalid_input')
  })
})

describe('errorMessage', () => {
  it('donne les messages français de la fiche', () => {
    expect(errorMessage('network')).toBe('Pas de connexion. Réessayez dans un moment.')
    expect(errorMessage('invalid_code')).toBe('Code incorrect ou expiré. Demandez-en un nouveau.')
    expect(errorMessage('already_member')).toBe('Cette personne fait déjà partie du foyer.')
    expect(errorMessage('invitation_pending')).toBe('Une invitation est déjà en attente. Annulez-la pour en créer une autre.')
    expect(errorMessage('invitation_not_found')).toBe('Cette invitation n\'existe plus.')
    expect(errorMessage('role_reserved')).toBe('Ce rôle est réservé à l\'invitation en attente.')
    expect(errorMessage('role_not_allowed')).toBe('Ce rôle n\'est pas disponible.')
    expect(errorMessage('not_allowed')).toBe('Cette action est réservée aux parents du foyer.')
  })

  it('renvoie le message générique pour un jeton inconnu', () => {
    expect(errorMessage('zzz')).toBe('Une erreur est survenue. Réessayez dans un moment.')
  })
})
