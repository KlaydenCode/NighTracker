import { describe, expect, it } from 'vitest'
import { parsePendingLogin, serializePendingLogin } from './pending-login'

const now = 1_000_000_000_000
const state = { email: 'maman@example.test', sentAt: now }

describe('parsePendingLogin', () => {
  it('relit ce qui a été sérialisé', () => {
    expect(parsePendingLogin(serializePendingLogin(state), now + 1000)).toEqual(state)
  })

  it('renvoie null si absent, illisible ou de forme inattendue', () => {
    expect(parsePendingLogin(null, now)).toBeNull()
    expect(parsePendingLogin('', now)).toBeNull()
    expect(parsePendingLogin('pas du json', now)).toBeNull()
    expect(parsePendingLogin('42', now)).toBeNull()
    expect(parsePendingLogin('null', now)).toBeNull()
    expect(parsePendingLogin(JSON.stringify({ email: 'maman@example.test' }), now)).toBeNull()
    expect(parsePendingLogin(JSON.stringify({ email: 3, sentAt: now }), now)).toBeNull()
  })

  it('refuse une adresse invalide', () => {
    expect(parsePendingLogin(serializePendingLogin({ email: 'pas-une-adresse', sentAt: now }), now)).toBeNull()
  })

  it('garde un état de 14 min 59 s et rejette 15 min', () => {
    const raw = serializePendingLogin(state)
    expect(parsePendingLogin(raw, now + (14 * 60 + 59) * 1000)).toEqual(state)
    expect(parsePendingLogin(raw, now + 15 * 60 * 1000)).toBeNull()
  })

  it('rejette un état daté du futur', () => {
    expect(parsePendingLogin(serializePendingLogin({ ...state, sentAt: now + 5000 }), now)).toBeNull()
  })
})
