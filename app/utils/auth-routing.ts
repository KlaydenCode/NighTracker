export type Membership = 'member' | 'none' | 'error'

export interface AuthRedirectInput {
  path: string
  hasSession: boolean
  /** État du foyer de l'utilisateur ; null tant qu'il n'est pas connu (visiteur sans session). */
  membership: Membership | null
  /** La requête contient `token_hash` (lien reçu par email). */
  hasLinkToken: boolean
}

const PUBLIC_PATHS = ['/login', '/confirm']

/** Chemin vers lequel rediriger, ou null pour laisser passer. */
export function resolveAuthRedirect(input: AuthRedirectInput): string | null {
  const { path, hasSession, membership, hasLinkToken } = input
  const isPublic = PUBLIC_PATHS.includes(path)

  if (!hasSession) {
    if (hasLinkToken && path !== '/confirm') return '/confirm'
    return isPublic ? null : '/login'
  }

  if (membership === 'member') {
    return isPublic || path === '/bienvenue' ? '/' : null
  }
  if (membership === 'none') {
    return path === '/bienvenue' ? null : '/bienvenue'
  }
  // 'error' (foyer non chargé) ou état inconnu : ne pas enfermer l'utilisateur sur une page publique.
  return isPublic ? '/' : null
}
