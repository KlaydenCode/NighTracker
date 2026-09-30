import type { Membership } from '~/utils/auth-routing'

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSupabaseSession()
  const household = useHousehold()
  const hasSession = Boolean(session.value)

  let membership: Membership | null = null
  if (hasSession) {
    await household.ensureLoaded()
    const status = household.state.value.status
    membership = status === 'member' ? 'member' : status === 'none' ? 'none' : 'error'
  }
  else {
    // Sans session, aucune requête n'est émise vers Supabase.
    household.reset()
  }

  const target = resolveAuthRedirect({
    path: to.path,
    hasSession,
    membership,
    hasLinkToken: typeof to.query.token_hash === 'string',
  })
  if (target === null) return

  // Le lien de l'email garde sa requête (token_hash) jusqu'à /confirm.
  if (target === '/confirm') return navigateTo({ path: target, query: to.query }, { replace: true })
  return navigateTo(target, { replace: true })
})
