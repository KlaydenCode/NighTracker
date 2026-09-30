import type { Database } from '~/types/database'
import type { PendingLogin } from '~/utils/pending-login'

export type CodeResult = 'ok' | 'invalid' | 'offline'

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(PENDING_LOGIN_KEY)
  }
  catch {
    return null
  }
}

/** Connexion par code à 6 chiffres ou par lien reçus par email, et déconnexion. */
export function useAuth() {
  const client = useSupabaseClient<Database>()
  const session = useSupabaseSession()
  const household = useHousehold()
  const invitations = useInvitations()

  function pendingLogin(): PendingLogin | null {
    return parsePendingLogin(readStorage(), Date.now())
  }

  function savePendingLogin(value: PendingLogin): void {
    try {
      window.localStorage.setItem(PENDING_LOGIN_KEY, serializePendingLogin(value))
    }
    catch {
      // Stockage indisponible (navigation privée) : l'étape du code ne survivra pas à un rechargement.
    }
  }

  function clearPendingLogin(): void {
    try {
      window.localStorage.removeItem(PENDING_LOGIN_KEY)
    }
    catch {
      // Rien à effacer.
    }
  }

  /**
   * Demande l'email de connexion. Toute réponse HTTP (succès, adresse refusée, limite d'envoi)
   * donne 'sent' : l'app ne révèle pas quelles adresses sont autorisées.
   */
  async function requestCode(email: string): Promise<'sent' | 'offline'> {
    savePendingLogin({ email, sentAt: Date.now() })
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/confirm`, shouldCreateUser: true },
    })
    if (error && isNetworkError(error)) {
      clearPendingLogin()
      return 'offline'
    }
    return 'sent'
  }

  async function finishVerification(result: Awaited<ReturnType<typeof client.auth.verifyOtp>>): Promise<CodeResult> {
    if (result.error) return isNetworkError(result.error) ? 'offline' : 'invalid'
    if (!result.data.session) return 'invalid'
    // La navigation qui suit lit cet état : ne pas attendre l'événement d'authentification.
    session.value = result.data.session
    clearPendingLogin()
    return 'ok'
  }

  async function verifyCode(email: string, code: string): Promise<CodeResult> {
    return await finishVerification(
      await client.auth.verifyOtp({ email, token: normalizeOtpCode(code), type: 'email' }),
    )
  }

  async function verifyLink(tokenHash: string): Promise<CodeResult> {
    return await finishVerification(
      await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' }),
    )
  }

  /** Déconnexion de cet appareil seulement (l'autre appareil du même parent reste connecté). */
  async function signOut(): Promise<'done' | 'offline'> {
    const { error } = await client.auth.signOut({ scope: 'local' })
    if (error && isNetworkError(error)) return 'offline'
    session.value = null
    clearPendingLogin()
    household.reset()
    invitations.pending.value = null
    await navigateTo('/login', { replace: true })
    return 'done'
  }

  return { pendingLogin, clearPendingLogin, requestCode, verifyCode, verifyLink, signOut }
}
