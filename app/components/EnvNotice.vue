<script setup lang="ts">
defineProps<{ missing: string[] }>()
</script>

<template>
  <p
    v-if="missing.length > 0"
    role="status"
    class="rounded-lg border border-amber-200 px-4 py-3 text-sm text-amber-200"
  >
    Configuration incomplète : variable(s) manquante(s) : {{ missing.join(', ') }}. Voir le README.
  </p>
</template>
