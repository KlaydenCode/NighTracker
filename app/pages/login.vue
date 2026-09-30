<script setup lang="ts">
type Step = 'email' | 'code'

const auth = useAuth()
const session = useSupabaseSession()
const visibleHeight = useVisibleHeight()
const missing = missingSupabaseEnv(useRuntimeConfig().public.supabase)

const step = ref<Step>('email')
const email = ref('')
const emailError = ref<string | null>(null)
const sending = ref(false)

const code = ref('')
const codeError = ref<string | null>(null)
const verifying = ref(false)
const resending = ref(false)
const sentAt = ref(0)
const now = ref(Date.now())

const codeField = ref<{ focus: () => void } | null>(null)
const emailField = ref<{ focus: () => void } | null>(null)

// Invalide les réponses tardives d'une demande abandonnée (changement d'adresse, réseau coupé).
let attempt = 0
let timer: ReturnType<typeof setInterval> | undefined

const remaining = computed(() => remainingSeconds(sentAt.value, now.value))
const resendLabel = computed(() =>
  resending.value ? 'Envoi en cours…' : remaining.value > 0 ? `Renvoyer dans ${remaining.value} s` : 'Renvoyer un code',
)
const containerStyle = computed(() => visibleHeightStyle(visibleHeight.value))

function startTimer(): void {
  now.value = Date.now()
  timer ??= setInterval(() => {
    now.value = Date.now()
  }, 1000)
}

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}

async function goToCodeStep(): Promise<void> {
  step.value = 'code'
  startTimer()
  await nextTick()
  codeField.value?.focus()
}

async function goToEmailStep(message: string | null): Promise<void> {
  attempt++
  stopTimer()
  auth.clearPendingLogin()
  step.value = 'email'
  sending.value = false
  resending.value = false
  code.value = ''
  codeError.value = null
  emailError.value = message
  await nextTick()
  emailField.value?.focus()
}

async function submitEmail(): Promise<void> {
  if (sending.value || missing.length > 0) return
  const normalized = normalizeEmail(email.value)
  const error = validateEmail(normalized)
  emailError.value = error
  if (error) return
  email.value = normalized

  const mine = ++attempt
  sending.value = true
  sentAt.value = Date.now()
  // Même écran, au même moment, quelle que soit l'adresse (l'app ne révèle pas qui est autorisé).
  await runWithNeutralDelay({
    request: auth.requestCode(normalized),
    isCurrent: () => mine === attempt,
    onOffline: () => goToEmailStep(errorMessage('network')),
    onDone: async () => {
      sending.value = false
      await goToCodeStep()
    },
  })
}

async function resend(): Promise<void> {
  if (resending.value || remaining.value > 0) return
  code.value = ''
  codeError.value = null
  const mine = ++attempt
  resending.value = true
  sentAt.value = Date.now()
  now.value = sentAt.value
  // Même délai fixe que le premier envoi : la durée ne dépend pas de l'adresse.
  await runWithNeutralDelay({
    request: auth.requestCode(email.value),
    isCurrent: () => mine === attempt,
    onOffline: () => goToEmailStep(errorMessage('network')),
    onDone: () => {
      resending.value = false
      codeField.value?.focus()
    },
  })
}

async function changeAddress(): Promise<void> {
  await goToEmailStep(null)
}

async function submitCode(): Promise<void> {
  if (verifying.value) return
  const error = validateOtpCode(code.value)
  codeError.value = error
  if (error) return
  verifying.value = true
  const result = await auth.verifyCode(email.value, code.value)
  verifying.value = false
  if (result === 'ok') {
    await navigateTo('/', { replace: true })
    return
  }
  codeError.value = errorMessage(result === 'offline' ? 'network' : 'invalid_code')
  codeField.value?.focus()
}

onMounted(() => {
  // Retour dans l'app (iOS peut la recharger) : l'étape du code revient avec l'adresse demandée.
  const pending = auth.pendingLogin()
  if (pending && missing.length === 0) {
    email.value = pending.email
    sentAt.value = pending.sentAt
    void goToCodeStep()
  }
  else {
    emailField.value?.focus()
  }
})

onBeforeUnmount(() => {
  attempt++
  stopTimer()
})

// Lien ouvert dans un autre onglet du même navigateur : la session apparaît ici.
watch(session, (value) => {
  if (value) void navigateTo('/', { replace: true })
})
</script>

<template>
  <main
    class="flex flex-col px-6 pt-8"
    :style="containerStyle"
  >
    <h1 class="text-2xl font-semibold">
      Carnet de nuits
    </h1>
    <EnvNotice
      :missing="missing"
      class="mt-6"
    />

    <form
      v-if="step === 'email'"
      class="mt-6 flex flex-1 flex-col"
      novalidate
      @submit.prevent="submitEmail"
    >
      <AppField
        ref="emailField"
        v-model="email"
        label="Adresse email"
        type="email"
        inputmode="email"
        autocomplete="email"
        autocapitalize="off"
        spellcheck="false"
        :disabled="missing.length > 0 || sending"
        :error="emailError"
        hint="Utilisez l'adresse à laquelle l'invitation a été autorisée."
        @input="emailError = null"
      />
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          type="submit"
          class="w-full"
          :disabled="missing.length > 0 || sending"
        >
          {{ sending ? 'Envoi en cours…' : 'Recevoir mon code' }}
        </AppButton>
      </div>
    </form>

    <form
      v-else
      class="mt-6 flex flex-1 flex-col"
      novalidate
      @submit.prevent="submitCode"
    >
      <p
        role="status"
        class="text-slate-300"
      >
        Si cette adresse est autorisée, un email vient d'être envoyé avec un code à 6 chiffres et un lien. Pensez à regarder dans les courriers indésirables.
      </p>
      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="min-w-0 break-words text-slate-200">{{ email }}</span>
        <AppButton
          variant="link"
          @click="changeAddress"
        >
          Changer d'adresse
        </AppButton>
      </div>

      <AppField
        ref="codeField"
        v-model="code"
        class="mt-4"
        label="Code reçu par email"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="7"
        autocapitalize="off"
        spellcheck="false"
        input-class="text-2xl tracking-widest"
        :error="codeError"
        @input="codeError = null"
      />

      <div class="mt-auto flex flex-col gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          variant="secondary"
          class="w-full"
          :disabled="resending || remaining > 0"
          @click="resend"
        >
          {{ resendLabel }}
        </AppButton>
        <AppButton
          type="submit"
          class="w-full"
          :disabled="verifying"
        >
          {{ verifying ? 'Vérification…' : 'Valider le code' }}
        </AppButton>
      </div>
    </form>
  </main>
</template>
