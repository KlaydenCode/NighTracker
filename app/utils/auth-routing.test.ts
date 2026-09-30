import { describe, expect, it } from 'vitest'
import { resolveAuthRedirect } from './auth-routing'
import type { Membership } from './auth-routing'

function redirect(path: string, hasSession: boolean, membership: Membership | null, hasLinkToken = false) {
  return resolveAuthRedirect({ path, hasSession, membership, hasLinkToken })
}

describe('sans session', () => {
  it.each(['/', '/reglages', '/bienvenue', '/inconnue'])('%s renvoie vers /login', (path) => {
    expect(redirect(path, false, null)).toBe('/login')
  })

  it.each(['/login', '/confirm'])('%s reste accessible', (path) => {
    expect(redirect(path, false, null)).toBeNull()
  })

  it('renvoie vers /confirm si la requête porte un token_hash, sauf déjà sur /confirm', () => {
    expect(redirect('/', false, null, true)).toBe('/confirm')
    expect(redirect('/login', false, null, true)).toBe('/confirm')
    expect(redirect('/confirm', false, null, true)).toBeNull()
  })
})

describe('membre d\'un foyer', () => {
  it.each(['/login', '/confirm', '/bienvenue'])('%s renvoie vers /', (path) => {
    expect(redirect(path, true, 'member')).toBe('/')
  })

  it.each(['/', '/reglages', '/inconnue'])('%s reste accessible', (path) => {
    expect(redirect(path, true, 'member')).toBeNull()
  })
})

describe('connecté sans foyer', () => {
  it('/bienvenue reste accessible', () => {
    expect(redirect('/bienvenue', true, 'none')).toBeNull()
  })

  it.each(['/', '/reglages', '/login', '/confirm', '/inconnue'])('%s renvoie vers /bienvenue', (path) => {
    expect(redirect(path, true, 'none')).toBe('/bienvenue')
  })
})

describe('foyer non chargé (erreur)', () => {
  it.each(['/login', '/confirm'])('%s renvoie vers /', (path) => {
    expect(redirect(path, true, 'error')).toBe('/')
  })

  it.each(['/', '/reglages', '/bienvenue', '/inconnue'])('%s laisse passer', (path) => {
    expect(redirect(path, true, 'error')).toBeNull()
  })
})
