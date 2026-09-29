export const SUPABASE_URL_PLACEHOLDER = 'https://supabase-url-manquante.invalid'
export const SUPABASE_KEY_PLACEHOLDER = 'cle-supabase-manquante'

const URL_VAR = 'NUXT_PUBLIC_SUPABASE_URL'
const KEY_VAR = 'NUXT_PUBLIC_SUPABASE_KEY'

function isMissing(value: string | null | undefined, placeholder: string): boolean {
  const trimmed = value?.trim()
  return !trimmed || trimmed === placeholder
}

/** Noms des variables d'environnement Supabase absentes (vides ou sentinelles). */
export function missingSupabaseEnv(config: { url?: string | null, key?: string | null }): string[] {
  const missing: string[] = []
  if (isMissing(config.url, SUPABASE_URL_PLACEHOLDER)) missing.push(URL_VAR)
  if (isMissing(config.key, SUPABASE_KEY_PLACEHOLDER)) missing.push(KEY_VAR)
  return missing
}
