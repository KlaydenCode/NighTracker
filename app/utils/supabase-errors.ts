const MESSAGES: Record<string, string> = {
  network: 'Pas de connexion. Réessayez dans un moment.',
  invalid_code: 'Code incorrect ou expiré. Demandez-en un nouveau.',
  not_authenticated: 'Votre session a expiré. Reconnectez-vous.',
  household_exists: 'Un foyer existe déjà. Demandez à l\'autre parent de vous inviter.',
  not_member: 'Aucun foyer n\'est associé à ce compte.',
  not_allowed: 'Cette action est réservée aux parents du foyer.',
  already_member: 'Cette personne fait déjà partie du foyer.',
  invitation_pending: 'Une invitation est déjà en attente. Annulez-la pour en créer une autre.',
  role_taken: 'Ce rôle est déjà pris dans le foyer.',
  role_reserved: 'Ce rôle est réservé à l\'invitation en attente.',
  role_not_allowed: 'Ce rôle n\'est pas disponible.',
  invitation_not_found: 'Cette invitation n\'existe plus.',
  invalid_input: 'Certaines informations ne sont pas valides.',
  unknown: 'Une erreur est survenue. Réessayez dans un moment.',
}

interface ErrorLike {
  name?: unknown
  message?: unknown
  code?: unknown
}

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? error as ErrorLike : null
}

/**
 * Vrai si la requête n'a pas obtenu de réponse HTTP : erreur Auth « réessayable »
 * ou erreur PostgREST sans code (échec de fetch).
 */
export function isNetworkError(error: unknown): boolean {
  const e = asErrorLike(error)
  if (!e) return false
  if (e.name === 'AuthRetryableFetchError') return true
  if (e.name === 'TypeError' && typeof e.message === 'string' && /fetch|network/i.test(e.message)) return true
  return 'hint' in e && 'details' in e && !e.code
}

/** Jeton d'erreur : message d'une erreur P0001 des fonctions SQL, 'network' ou 'unknown'. */
export function errorToken(error: unknown): string {
  if (isNetworkError(error)) return 'network'
  const e = asErrorLike(error)
  if (!e) return 'unknown'
  if (e.code === 'P0001' && typeof e.message === 'string' && e.message in MESSAGES) return e.message
  // Écritures directes refusées ou sans effet (RLS), contraintes de colonne.
  if (e.code === '42501' || e.code === 'PGRST116') return 'not_allowed'
  if (e.code === '23514' || e.code === '22007' || e.code === '22008') return 'invalid_input'
  return 'unknown'
}

/** Message français d'un jeton d'erreur. */
export function errorMessage(token: string): string {
  return MESSAGES[token] ?? MESSAGES.unknown!
}
