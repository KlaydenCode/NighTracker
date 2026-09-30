import type { Database } from './database'

export type Caregiver = Database['public']['Enums']['caregiver']

/** Rôles proposés par l'interface au lot 1 (le rôle « autre » n'est jamais proposé). */
export type ParentRole = 'maman' | 'papa'

/** Résultat d'une action des composables : réussite, ou jeton d'erreur (voir `errorToken`). */
export type ActionResult = { ok: true } | { ok: false, token: string }

export interface HouseholdSummary {
  id: string
  name: string
}

export interface ChildSummary {
  id: string
  first_name: string
  birth_date: string
}

export interface MemberSummary {
  user_id: string
  role: Caregiver
  display_name: string
}

export interface HouseholdState {
  status: 'idle' | 'member' | 'none' | 'error'
  userId: string | null
  household: HouseholdSummary | null
  child: ChildSummary | null
  members: MemberSummary[]
}

export interface OnboardingState {
  status: 'member' | 'invited' | 'create' | 'no_household'
  household_name: string | null
  invited_role: Caregiver | null
}

export interface PendingInvitation {
  id: string
  email: string
  role: Caregiver
  created_at: string
}
