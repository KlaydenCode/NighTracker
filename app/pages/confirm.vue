<script setup lang="ts">
type Status = 'checking' | 'invalid' | 'offline'

const auth = useAuth()
const route = useRoute()

const status = ref<Status>('checking')

async function verify(): Promise<void> {
  const tokenHash = typeof route.query.token_hash === 'string' ? route.query.token_hash : ''
  if (!tokenHash) {
    status.value = 'invalid'
    return
  }
  status.value = 'checking'
  const result = await auth.verifyLink(tokenHash)
  if (result === 'ok') {
    await navigateTo('/', { replace: true })
    return
  }
  status.value = result === 'offline' ? 'offline' : 'invalid'
}

onMounted(verify)
</script>

<template>
  <main class="flex min-h-dvh flex-col px-6 pt-8">
    <h1 class="text-2xl font-semibold">
      Carnet de nuits
    </h1>

    <p
      v-if="status === 'checking'"
      role="status"
      class="mt-6 text-slate-300"
    >
      Connexion en cours…
    </p>

    <template v-else-if="status === 'offline'">
      <p
        role="alert"
        class="mt-6 text-rose-300"
      >
        {{ errorMessage('network') }}
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          class="w-full"
          @click="verify"
        >
          Réessayer
        </AppButton>
      </div>
    </template>

    <template v-else>
      <p
        role="alert"
        class="mt-6 text-slate-200"
      >
        Ce lien n'est plus valable. Demandez-en un nouveau.
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          class="w-full"
          @click="navigateTo('/login', { replace: true })"
        >
          Demander un nouveau code
        </AppButton>
      </div>
    </template>
  </main>
</template>
