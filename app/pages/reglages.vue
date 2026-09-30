<script setup lang="ts">
import type { ParentRole } from '~/types/app'

type FieldKey = 'householdName' | 'firstName' | 'birthDate' | 'displayName' | 'role' | 'invitation'

const household = useHousehold()
const invitations = useInvitations()
const auth = useAuth()

const state = household.state
const today = todayInParis()

const householdName = ref('')
const firstName = ref('')
const birthDate = ref('')
const displayName = ref('')
const role = ref<ParentRole | null>(null)

const errors = reactive<Record<FieldKey, string | null>>({
  householdName: null,
  firstName: null,
  birthDate: null,
  displayName: null,
  role: null,
  invitation: null,
})
const savedField = ref<FieldKey | null>(null)
let savedTimer: ReturnType<typeof setTimeout> | undefined

const inviteEmail = ref('')
const inviteRole = ref<ParentRole | null>(null)
const inviting = ref(false)
const confirmingRevoke = ref(false)
const revoking = ref(false)
const copyMessage = ref<string | null>(null)
const copyFallback = ref<string | null>(null)
const signOutError = ref<string | null>(null)
const loadError = ref<string | null>(null)

const me = computed(() => state.value.members.find(m => m.user_id === state.value.userId) ?? null)
const others = computed(() => state.value.members.filter(m => m.user_id !== state.value.userId))
const freeRoles = computed<ParentRole[]>(() =>
  (['maman', 'papa'] as const).filter(r => !state.value.members.some(m => m.role === r)),
)
const canInvite = computed(() => !invitations.pending.value && freeRoles.value.length > 0)
const onlyRole = computed(() => (freeRoles.value.length === 1 ? freeRoles.value[0] : undefined))
const ageText = computed(() =>
  state.value.child ? formatAge(state.value.child.birth_date, today) : '',
)

// Un seul rôle libre : il est proposé et pré-sélectionné.
watch(onlyRole, (value) => {
  if (value) inviteRole.value = value
}, { immediate: true })

function syncFromState(): void {
  householdName.value = state.value.household?.name ?? ''
  firstName.value = state.value.child?.first_name ?? ''
  birthDate.value = state.value.child?.birth_date ?? ''
  displayName.value = me.value?.display_name ?? ''
  const myRole = me.value?.role
  role.value = myRole === 'maman' || myRole === 'papa' ? myRole : null
}

function flashSaved(field: FieldKey): void {
  savedField.value = field
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => {
    if (savedField.value === field) savedField.value = null
  }, 2000)
}

function fail(field: FieldKey, message: string): void {
  errors[field] = message
  syncFromState()
}

async function saveHouseholdName(): Promise<void> {
  const value = householdName.value.trim()
  if (value === state.value.household?.name) return
  const error = validateHouseholdName(value)
  if (error) return fail('householdName', error)
  const result = await household.updateHouseholdName(value)
  if (!result.ok) return fail('householdName', errorMessage(result.token))
  syncFromState()
  flashSaved('householdName')
}

async function saveChild(field: 'firstName' | 'birthDate'): Promise<void> {
  const child = state.value.child
  if (!child) return
  const first = firstName.value.trim()
  const birth = birthDate.value
  if (first === child.first_name && birth === child.birth_date) return
  const error = field === 'firstName' ? validateFirstName(first) : validateBirthDate(birth, today)
  if (error) return fail(field, error)
  const result = await household.updateChild({ first_name: first, birth_date: birth })
  if (!result.ok) return fail(field, errorMessage(result.token))
  syncFromState()
  flashSaved(field)
}

async function saveMembership(field: 'displayName' | 'role'): Promise<void> {
  const current = me.value
  if (!current || !role.value) return
  const name = displayName.value.trim()
  if (name === current.display_name && role.value === current.role) return
  const error = field === 'displayName' ? validateDisplayName(name) : validateRole(role.value)
  if (error) return fail(field, error)
  const result = await household.updateMyMembership({ displayName: name, role: role.value })
  if (!result.ok) return fail(field, errorMessage(result.token))
  syncFromState()
  flashSaved(field)
}

function onRoleChange(value: ParentRole | null): void {
  role.value = value
  errors.role = null
  void saveMembership('role')
}

async function invite(): Promise<void> {
  if (inviting.value) return
  const chosen = onlyRole.value ?? inviteRole.value
  errors.invitation = validateEmail(inviteEmail.value) ?? validateRole(chosen ?? null)
  if (errors.invitation || !chosen) return
  inviting.value = true
  const result = await invitations.invite(normalizeEmail(inviteEmail.value), chosen)
  inviting.value = false
  if (!result.ok) {
    errors.invitation = errorMessage(result.token)
    return
  }
  inviteEmail.value = ''
  copyMessage.value = null
  copyFallback.value = null
}

async function revoke(): Promise<void> {
  const pending = invitations.pending.value
  if (!pending || revoking.value) return
  revoking.value = true
  const result = await invitations.revoke(pending.id)
  revoking.value = false
  confirmingRevoke.value = false
  if (!result.ok) errors.invitation = errorMessage(result.token)
}

async function copyAppAddress(): Promise<void> {
  const address = window.location.origin
  try {
    await navigator.clipboard.writeText(address)
    copyMessage.value = 'Adresse copiée.'
    copyFallback.value = null
  }
  catch {
    copyMessage.value = null
    copyFallback.value = address
  }
}

async function signOut(): Promise<void> {
  signOutError.value = null
  const result = await auth.signOut()
  if (result === 'offline') signOutError.value = errorMessage('network')
}

async function load(): Promise<void> {
  loadError.value = null
  await household.refresh()
  if (state.value.status === 'error') {
    loadError.value = errorMessage('network')
    return
  }
  syncFromState()
  const result = await invitations.load()
  if (!result.ok) loadError.value = errorMessage(result.token)
}

onMounted(() => {
  syncFromState()
  void load()
})

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
  <main class="flex min-h-dvh flex-col gap-8 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
    <header class="flex items-center justify-between gap-3">
      <h1 class="text-2xl font-semibold">
        Réglages
      </h1>
      <NuxtLink
        to="/"
        class="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg px-2 text-amber-200 underline underline-offset-4"
      >
        Accueil
      </NuxtLink>
    </header>

    <p
      v-if="loadError"
      role="alert"
      class="text-rose-300"
    >
      {{ loadError }}
    </p>

    <section aria-labelledby="titre-foyer">
      <h2
        id="titre-foyer"
        class="mb-2 text-lg font-semibold"
      >
        Foyer
      </h2>
      <AppField
        v-model="householdName"
        label="Nom du foyer"
        type="text"
        autocomplete="off"
        :error="errors.householdName"
        :saved="savedField === 'householdName'"
        @input="errors.householdName = null"
        @blur="saveHouseholdName"
      />
    </section>

    <section aria-labelledby="titre-enfant">
      <h2
        id="titre-enfant"
        class="mb-2 text-lg font-semibold"
      >
        Enfant
      </h2>
      <div class="flex flex-col gap-2">
        <AppField
          v-model="firstName"
          label="Prénom"
          type="text"
          autocomplete="off"
          :error="errors.firstName"
          :saved="savedField === 'firstName'"
          @input="errors.firstName = null"
          @blur="saveChild('firstName')"
        />
        <AppField
          v-model="birthDate"
          label="Date de naissance"
          type="date"
          :max="today"
          :error="errors.birthDate"
          :saved="savedField === 'birthDate'"
          @input="errors.birthDate = null"
          @change="saveChild('birthDate')"
        />
        <p
          v-if="ageText"
          class="text-slate-300"
        >
          Âge : {{ ageText }}
        </p>
      </div>
    </section>

    <section aria-labelledby="titre-membres">
      <h2
        id="titre-membres"
        class="mb-2 text-lg font-semibold"
      >
        Membres
      </h2>
      <div
        v-if="me"
        class="flex flex-col gap-2 rounded-lg border border-slate-700 p-3"
      >
        <p class="text-slate-200">
          {{ me.display_name }} (vous)
        </p>
        <AppField
          v-model="displayName"
          label="Mon nom d'affichage"
          type="text"
          autocomplete="nickname"
          :error="errors.displayName"
          :saved="savedField === 'displayName'"
          @input="errors.displayName = null"
          @blur="saveMembership('displayName')"
        />
        <RolePicker
          :model-value="role"
          label="Mon rôle"
          :error="errors.role"
          @update:model-value="onRoleChange"
        />
        <p
          v-if="savedField === 'role'"
          aria-live="polite"
          class="text-sm text-slate-400"
        >
          Enregistré
        </p>
      </div>
      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="member in others"
          :key="member.user_id"
          class="flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-700 px-3 py-2"
        >
          <span class="text-slate-200">{{ member.display_name }}</span>
          <span class="text-slate-400">{{ roleLabel(member.role) }}</span>
        </li>
      </ul>
    </section>

    <section aria-labelledby="titre-invitations">
      <h2
        id="titre-invitations"
        class="mb-2 text-lg font-semibold"
      >
        Invitations
      </h2>

      <div
        v-if="invitations.pending.value"
        class="flex flex-col gap-3"
      >
        <p class="text-sm text-slate-400">
          Invitation en attente
        </p>
        <div class="rounded-lg border border-slate-700 p-3">
          <p class="break-words text-slate-200">
            {{ invitations.pending.value.email }}
          </p>
          <p class="text-slate-400">
            {{ roleLabel(invitations.pending.value.role) }}, le {{ formatDateFr(invitations.pending.value.created_at) }}
          </p>
        </div>
        <p class="text-slate-300">
          Adresse autorisée. Aucun email d'invitation n'est envoyé : demandez à cette personne d'ouvrir l'app et de demander un code de connexion avec cette adresse.
        </p>
        <AppButton
          variant="secondary"
          @click="copyAppAddress"
        >
          Copier l'adresse de l'app
        </AppButton>
        <p
          v-if="copyMessage"
          role="status"
          class="text-sm text-slate-400"
        >
          {{ copyMessage }}
        </p>
        <p
          v-if="copyFallback"
          class="select-all break-all text-slate-200"
        >
          {{ copyFallback }}
        </p>

        <div
          v-if="confirmingRevoke"
          class="flex flex-col gap-3 rounded-lg border border-slate-600 p-3"
        >
          <p class="text-slate-200">
            Annuler l'invitation pour {{ invitations.pending.value.email }} ?
          </p>
          <div class="flex gap-3">
            <AppButton
              class="flex-1"
              :disabled="revoking"
              @click="revoke"
            >
              Oui, annuler
            </AppButton>
            <AppButton
              variant="secondary"
              class="flex-1"
              @click="confirmingRevoke = false"
            >
              Non
            </AppButton>
          </div>
        </div>
        <AppButton
          v-else
          variant="secondary"
          @click="confirmingRevoke = true"
        >
          Annuler l'invitation
        </AppButton>
        <p
          v-if="errors.invitation"
          role="alert"
          class="text-sm text-rose-300"
        >
          {{ errors.invitation }}
        </p>
      </div>

      <form
        v-else-if="canInvite"
        class="flex flex-col gap-2"
        novalidate
        @submit.prevent="invite"
      >
        <AppField
          v-model="inviteEmail"
          label="Adresse email de l'autre parent"
          type="email"
          inputmode="email"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :error="errors.invitation"
          @input="errors.invitation = null"
        />
        <RolePicker
          v-model="inviteRole"
          label="Rôle"
          :only="onlyRole"
        />
        <AppButton
          type="submit"
          :disabled="inviting"
        >
          {{ inviting ? 'Envoi…' : 'Inviter' }}
        </AppButton>
      </form>

      <p
        v-else
        class="text-slate-300"
      >
        Les deux rôles du foyer sont pris : aucune invitation à envoyer.
      </p>
    </section>

    <section aria-labelledby="titre-compte">
      <h2
        id="titre-compte"
        class="mb-2 text-lg font-semibold"
      >
        Compte
      </h2>
      <AppButton
        variant="secondary"
        class="w-full"
        @click="signOut"
      >
        Se déconnecter
      </AppButton>
      <p
        v-if="signOutError"
        role="alert"
        class="mt-2 text-sm text-rose-300"
      >
        {{ signOutError }}
      </p>
    </section>
  </main>
</template>
