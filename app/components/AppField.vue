<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  label: string
  error?: string | null
  saved?: boolean
  hint?: string
  /** Classes ajoutées au champ lui-même (les classes du composant vont sur son conteneur). */
  inputClass?: string
}>()

// `class` et `style` habillent le conteneur ; tout le reste (type, inputmode, @blur…) va sur le champ.
function fieldAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
}

const model = defineModel<string>({ default: '' })
const input = ref<HTMLInputElement | null>(null)
const uid = useId()
const inputId = `field-${uid}`
const messageId = `field-msg-${uid}`
const describedBy = computed(() => (props.error || props.hint || props.saved ? messageId : undefined))

function focus(): void {
  input.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div
    class="flex flex-col gap-1"
    :class="$attrs.class"
    :style="$attrs.style"
  >
    <label
      :for="inputId"
      class="text-sm text-slate-300"
    >{{ label }}</label>
    <input
      :id="inputId"
      ref="input"
      v-model="model"
      v-bind="fieldAttrs($attrs)"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="min-h-12 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-base text-slate-200 placeholder:text-slate-500 focus:border-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-200 disabled:opacity-60"
      :class="[error ? 'border-rose-300' : '', inputClass]"
    >
    <p
      :id="messageId"
      class="min-h-5 text-sm"
      :class="error ? 'text-rose-300' : 'text-slate-400'"
      :role="error ? 'alert' : undefined"
      :aria-live="error ? undefined : 'polite'"
    >
      <template v-if="error">
        {{ error }}
      </template>
      <template v-else-if="saved">
        Enregistré
      </template>
      <template v-else-if="hint">
        {{ hint }}
      </template>
    </p>
  </div>
</template>
