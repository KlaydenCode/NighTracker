<script setup lang="ts">
const config = useRuntimeConfig()
const missing = missingSupabaseEnv(config.public.supabase)
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <h1 class="text-3xl font-semibold">
      Carnet de nuits
    </h1>
    <p class="mt-3 text-slate-300">
      Le carnet de suivi du soir, de la nuit et du matin.
    </p>
    <p
      v-if="missing.length > 0"
      role="status"
      class="mt-8 max-w-sm rounded-lg border border-amber-200 px-4 py-3 text-sm text-amber-200"
    >
      Configuration incomplète : variable(s) manquante(s) : {{ missing.join(', ') }}. Voir le README.
    </p>
  </main>
</template>
