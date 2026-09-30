<script setup lang="ts">
import type { OnboardingState, ParentRole } from '~/types/app'

type Mode = 'loading' | 'create' | 'invited' | 'no_household' | 'error'

const household = useHousehold()
const auth = useAuth()

const mode = ref<Mode>('loading')
const onboarding = ref<OnboardingState | null>(null)
const loadError = ref<string | null>(null)

const firstName = ref('')
const birthDate = ref('')
const role = ref<ParentRole | null>(null)
const displayName = ref('')
const errors = reactive({
  firstName: null as string | null,
  birthDate: null as string | null,
  role: null as string | null,
  displayName: null as string | null,
  form: null as string | null,
})
const submitting = ref(false)
const signOutError = ref<string | null>(null)

const today = todayInParis()
const invitedRole = computed<ParentRole | null>(() => {
  const value = onboarding.value?.invited_role
  return value === 'maman' || value === 'papa' ? value : null
})

async function load(): Promise<void> {
  mode.value = 'loading'
  loadError.value = null
  const result = await household.getOnboardingState()
  if (!result.ok) {
    loadError.value = errorMessage(result.token)
    mode.value = 'error'
    return
  }
  onboarding.value = result.state
  switch (result.state.status) {
    case 'member':
      await household.refresh()
      await navigateTo('/', { replace: true })
      return
    case 'invited':
      displayName.value = invitedRole.value ? roleLabel(invitedRole.value) : ''
      mode.value = 'invited'
      return
    case 'create':
      mode.value = 'create'
      return
    default:
      mode.value = 'no_household'
  }
}

// Le nom d'affichage suit le rôle choisi tant qu'il n'a pas été personnalisé.
watch(role, (value) => {
  errors.role = null
  if (value && (displayName.value === '' || displayName.value === 'Maman' || displayName.value === 'Papa')) {
    displayName.value = roleLabel(value)
  }
})

async function submitCreate(): Promise<void> {
  if (submitting.value) return
  errors.firstName = validateFirstName(firstName.value)
  errors.birthDate = validateBirthDate(birthDate.value, today)
  errors.role = validateRole(role.value)
  errors.displayName = validateDisplayName(displayName.value)
  errors.form = null
  if (errors.firstName || errors.birthDate || errors.role || errors.displayName || !role.value) return

  submitting.value = true
  const result = await household.createHousehold({
    firstName: firstName.value.trim(),
    birthDate: birthDate.value,
    role: role.value,
    displayName: displayName.value.trim(),
  })
  if (result.ok) {
    await navigateTo('/', { replace: true })
    return
  }
  if (result.token === 'household_exists') {
    // Double touche : le foyer vient peut-être d'être créé par ce même compte.
    await household.refresh()
    if (household.state.value.status === 'member') {
      await navigateTo('/', { replace: true })
      return
    }
  }
  errors.form = errorMessage(result.token)
  submitting.value = false
}

async function submitJoin(): Promise<void> {
  if (submitting.value) return
  errors.displayName = validateDisplayName(displayName.value)
  errors.form = null
  if (errors.displayName) return

  submitting.value = true
  const result = await household.acceptInvitation(displayName.value.trim())
  if (result.ok) {
    await navigateTo('/', { replace: true })
    return
  }
  errors.form = errorMessage(result.token)
  submitting.value = false
  if (result.token === 'invitation_not_found') await load()
}

async function signOut(): Promise<void> {
  signOutError.value = null
  const result = await auth.signOut()
  if (result === 'offline') signOutError.value = errorMessage('network')
}

onMounted(load)
</script>

<template>
  <main class="flex min-h-dvh flex-col px-6 pt-8">
    <h1 class="text-2xl font-semibold">
      Bienvenue
    </h1>

    <p
      v-if="mode === 'loading'"
      role="status"
      class="mt-6 text-slate-300"
    >
      Chargement…
    </p>

    <template v-else-if="mode === 'error'">
      <p
        role="alert"
        class="mt-6 text-rose-300"
      >
        {{ loadError }}
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          class="w-full"
          @click="load"
        >
          Réessayer
        </AppButton>
      </div>
    </template>

    <form
      v-else-if="mode === 'create'"
      class="mt-6 flex flex-1 flex-col"
      novalidate
      @submit.prevent="submitCreate"
    >
      <div class="flex flex-col gap-2">
        <AppField
          v-model="firstName"
          label="Prénom de l'enfant"
          type="text"
          autocomplete="off"
          :error="errors.firstName"
          @input="errors.firstName = null"
        />
        <AppField
          v-model="birthDate"
          label="Date de naissance"
          type="date"
          :max="today"
          :error="errors.birthDate"
          @change="errors.birthDate = null"
        />
        <RolePicker
          v-model="role"
          label="Mon rôle"
          :error="errors.role"
        />
        <AppField
          v-model="displayName"
          label="Mon nom d'affichage"
          type="text"
          autocomplete="nickname"
          :error="errors.displayName"
          @input="errors.displayName = null"
        />
      </div>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p
          v-if="errors.form"
          role="alert"
          class="mb-3 text-sm text-rose-300"
        >
          {{ errors.form }}
        </p>
        <AppButton
          type="submit"
          class="w-full"
          :disabled="submitting"
        >
          {{ submitting ? 'Création…' : 'Créer le foyer' }}
        </AppButton>
      </div>
    </form>

    <form
      v-else-if="mode === 'invited'"
      class="mt-6 flex flex-1 flex-col"
      novalidate
      @submit.prevent="submitJoin"
    >
      <p class="text-slate-200">
        Vous êtes invité·e à rejoindre le foyer « {{ onboarding?.household_name }} ».
      </p>
      <p
        v-if="invitedRole"
        class="mt-2 text-slate-300"
      >
        Rôle attribué : {{ roleLabel(invitedRole) }}
      </p>
      <AppField
        v-model="displayName"
        class="mt-4"
        label="Mon nom d'affichage"
        type="text"
        autocomplete="nickname"
        :error="errors.displayName"
        @input="errors.displayName = null"
      />
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p
          v-if="errors.form"
          role="alert"
          class="mb-3 text-sm text-rose-300"
        >
          {{ errors.form }}
        </p>
        <AppButton
          type="submit"
          class="w-full"
          :disabled="submitting"
        >
          {{ submitting ? 'Un instant…' : 'Rejoindre le foyer' }}
        </AppButton>
      </div>
    </form>

    <template v-else>
      <p class="mt-6 text-slate-200">
        Aucun foyer n'est associé à cette adresse. Demandez à l'autre parent de vous inviter avec l'adresse que vous utilisez ici.
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p
          v-if="signOutError"
          role="alert"
          class="mb-3 text-sm text-rose-300"
        >
          {{ signOutError }}
        </p>
        <AppButton
          variant="secondary"
          class="w-full"
          @click="signOut"
        >
          Se déconnecter
        </AppButton>
      </div>
    </template>
  </main>
</template>
