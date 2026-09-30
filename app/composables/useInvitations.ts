import type { Database } from '~/types/database'
import type { ActionResult, ParentRole, PendingInvitation } from '~/types/app'

/** Invitation en attente du foyer (un seul enregistrement possible, SPEC §5.4). */
export function useInvitations() {
  const client = useSupabaseClient<Database>()
  const pending = useState<PendingInvitation | null>('pending-invitation', () => null)
  const loaded = useState<boolean>('pending-invitation-loaded', () => false)

  async function load(): Promise<ActionResult> {
    const { data, error } = await client
      .from('household_invitations')
      .select('id, email, role, created_at')
      .is('accepted_at', null)
      .maybeSingle()
    if (error) return { ok: false, token: errorToken(error) }
    pending.value = data
    loaded.value = true
    return { ok: true }
  }

  async function invite(email: string, role: ParentRole): Promise<ActionResult> {
    const { error } = await client.rpc('invite_member', { p_email: email, p_role: role })
    if (error) return { ok: false, token: errorToken(error) }
    return await load()
  }

  async function revoke(id: string): Promise<ActionResult> {
    const { error } = await client.from('household_invitations').delete().eq('id', id)
    if (error) return { ok: false, token: errorToken(error) }
    pending.value = null
    return { ok: true }
  }

  return { pending, loaded, load, invite, revoke }
}
