<script setup lang="ts">
import type { ParentRole } from '~/types/app'

const props = defineProps<{
  /** Ne propose que ce rôle (les deux sinon). Jamais « Autre » au lot 1. */
  only?: ParentRole
  disabled?: boolean
  label?: string
  error?: string | null
}>()

const model = defineModel<ParentRole | null>({ default: null })

const options: { value: ParentRole, label: string }[] = [
  { value: 'maman', label: 'Maman' },
  { value: 'papa', label: 'Papa' },
]

const visible = computed(() => options.filter(o => !props.only || o.value === props.only))
const uid = useId()
</script>

<template>
  <div class="flex flex-col gap-1">
    <span
      v-if="label"
      :id="`role-label-${uid}`"
      class="text-sm text-slate-300"
    >{{ label }}</span>
    <div
      role="radiogroup"
      :aria-labelledby="label ? `role-label-${uid}` : undefined"
      class="flex gap-3"
    >
      <button
        v-for="option in visible"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="model === option.value"
        :disabled="disabled"
        class="min-h-12 flex-1 rounded-lg border px-4 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:opacity-60"
        :class="model === option.value
          ? 'border-amber-200 bg-amber-200 font-semibold text-slate-900'
          : 'border-slate-600 bg-slate-800 text-slate-200'"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
    <p
      class="min-h-5 text-sm text-rose-300"
      :role="error ? 'alert' : undefined"
    >
      {{ error }}
    </p>
  </div>
</template>
