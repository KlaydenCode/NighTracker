import { describe, expect, it } from 'vitest'
import {
  SUPABASE_KEY_PLACEHOLDER,
  SUPABASE_URL_PLACEHOLDER,
  missingSupabaseEnv,
} from './supabase-env'

describe('missingSupabaseEnv', () => {
  it('retourne une liste vide si l\'URL et la clé sont valides', () => {
    expect(missingSupabaseEnv({ url: 'https://exemple.supabase.co', key: 'cle-publique' })).toEqual([])
  })

  it('signale l\'URL absente', () => {
    expect(missingSupabaseEnv({ url: undefined, key: 'cle-publique' })).toEqual(['NUXT_PUBLIC_SUPABASE_URL'])
  })

  it('signale la clé vide ou faite d\'espaces', () => {
    expect(missingSupabaseEnv({ url: 'https://exemple.supabase.co', key: '' })).toEqual(['NUXT_PUBLIC_SUPABASE_KEY'])
    expect(missingSupabaseEnv({ url: 'https://exemple.supabase.co', key: '   ' })).toEqual(['NUXT_PUBLIC_SUPABASE_KEY'])
  })

  it('signale les deux sentinelles, URL puis clé', () => {
    expect(missingSupabaseEnv({ url: SUPABASE_URL_PLACEHOLDER, key: SUPABASE_KEY_PLACEHOLDER }))
      .toEqual(['NUXT_PUBLIC_SUPABASE_URL', 'NUXT_PUBLIC_SUPABASE_KEY'])
  })
})
