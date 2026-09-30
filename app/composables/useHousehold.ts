import type { Database } from '~/types/database'
import type {
  ActionResult,
  Caregiver,
  ChildSummary,
  HouseholdState,
  OnboardingState,
  ParentRole,
} from '~/types/app'

function emptyState(): HouseholdState {
  return { status: 'idle', userId: null, household: null, child: null, members: [] }
}

// Chargement en cours, partagé entre les appels (la navigation et la page peuvent le demander ensemble).
let inflight: Promise<void> | null = null

/** État partagé du foyer du compte connecté, et actions sur ce foyer. */
export function useHousehold() {
  const client = useSupabaseClient<Database>()
  const state = useState<HouseholdState>('household', emptyState)

  function reset(): void {
    state.value = emptyState()
  }

  async function load(userId: string): Promise<void> {
    const { data, error } = await client
      .from('households')
      .select('id, name, children(id, first_name, birth_date), household_members(user_id, role, display_name)')
      .maybeSingle()

    if (error) {
      state.value = { ...emptyState(), status: 'error', userId }
      return
    }
    if (!data) {
      state.value = { ...emptyState(), status: 'none', userId }
      return
    }
    state.value = {
      status: 'member',
      userId,
      household: { id: data.id, name: data.name },
      child: data.children[0] ?? null,
      members: data.household_members,
    }
  }

  async function refresh(): Promise<void> {
    const { data } = await client.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) {
      reset()
      return
    }
    inflight ??= load(userId).finally(() => {
      inflight = null
    })
    await inflight
  }

  /** Charge le foyer si ce n'est pas déjà fait pour le compte connecté. */
  async function ensureLoaded(): Promise<void> {
    const { data } = await client.auth.getSession()
    const userId = data.session?.user.id
    if (!userId) {
      reset()
      return
    }
    const loaded = state.value.userId === userId
      && (state.value.status === 'member' || state.value.status === 'none')
    if (loaded) return
    await refresh()
  }

  async function getOnboardingState(): Promise<{ ok: true, state: OnboardingState } | { ok: false, token: string }> {
    const { data, error } = await client.rpc('get_onboarding_state')
    if (error) return { ok: false, token: errorToken(error) }
    const row = data[0]
    if (!row) return { ok: false, token: 'unknown' }
    return {
      ok: true,
      state: {
        status: row.status as OnboardingState['status'],
        household_name: row.household_name,
        invited_role: row.invited_role,
      },
    }
  }

  async function createHousehold(input: {
    firstName: string
    birthDate: string
    role: ParentRole
    displayName: string
  }): Promise<ActionResult> {
    const { error } = await client.rpc('create_household', {
      p_child_first_name: input.firstName,
      p_birth_date: input.birthDate,
      p_role: input.role,
      p_display_name: input.displayName,
    })
    if (error) return { ok: false, token: errorToken(error) }
    await refresh()
    return { ok: true }
  }

  async function acceptInvitation(displayName: string): Promise<ActionResult> {
    const { error } = await client.rpc('accept_invitation', { p_display_name: displayName })
    if (error) return { ok: false, token: errorToken(error) }
    await refresh()
    return { ok: true }
  }

  async function updateHouseholdName(name: string): Promise<ActionResult> {
    const household = state.value.household
    if (!household) return { ok: false, token: 'not_member' }
    const { data, error } = await client
      .from('households')
      .update({ name: name.trim() })
      .eq('id', household.id)
      .select('id, name')
      .single()
    if (error) return { ok: false, token: errorToken(error) }
    state.value = { ...state.value, household: { id: data.id, name: data.name } }
    return { ok: true }
  }

  async function updateChild(values: { first_name: string, birth_date: string }): Promise<ActionResult> {
    const child = state.value.child
    if (!child) return { ok: false, token: 'not_member' }
    const { data, error } = await client
      .from('children')
      .update({ first_name: values.first_name.trim(), birth_date: values.birth_date })
      .eq('id', child.id)
      .select('id, first_name, birth_date')
      .single()
    if (error) return { ok: false, token: errorToken(error) }
    const updated: ChildSummary = { id: data.id, first_name: data.first_name, birth_date: data.birth_date }
    state.value = { ...state.value, child: updated }
    return { ok: true }
  }

  async function updateMyMembership(values: { displayName: string, role: Caregiver }): Promise<ActionResult> {
    const { error } = await client.rpc('update_my_membership', {
      p_display_name: values.displayName,
      p_role: values.role,
    })
    if (error) return { ok: false, token: errorToken(error) }
    await refresh()
    return { ok: true }
  }

  return {
    state,
    reset,
    refresh,
    ensureLoaded,
    getOnboardingState,
    createHousehold,
    acceptInvitation,
    updateHouseholdName,
    updateChild,
    updateMyMembership,
  }
}
