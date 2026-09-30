<script setup lang="ts">
const household = useHousehold()
const state = household.state
const loading = ref(false)

const ageText = computed(() => {
  const child = state.value.child
  return child ? formatAge(child.birth_date, todayInParis()) : ''
})

async function retry(): Promise<void> {
  loading.value = true
  await household.refresh()
  loading.value = false
}
</script>

<template>
  <main class="flex min-h-dvh flex-col px-6 pt-8">
    <h1 class="text-3xl font-semibold">
      Carnet de nuits
    </h1>

    <template v-if="state.status === 'member' && state.household">
      <p class="mt-3 text-lg text-slate-200">
        {{ state.household.name }}
      </p>
      <p
        v-if="state.child"
        class="mt-1 text-slate-300"
      >
        {{ state.child.first_name }}<template v-if="ageText">
          , {{ ageText }}
        </template>
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <NuxtLink
          to="/reglages"
          class="inline-flex min-h-12 min-w-12 items-center rounded-lg px-2 text-amber-200 underline underline-offset-4"
        >
          Réglages
        </NuxtLink>
      </div>
    </template>

    <template v-else>
      <p
        role="alert"
        class="mt-6 text-rose-300"
      >
        {{ errorMessage('network') }}
      </p>
      <div class="mt-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <AppButton
          class="w-full"
          :disabled="loading"
          @click="retry"
        >
          Réessayer
        </AppButton>
      </div>
    </template>
  </main>
</template>
