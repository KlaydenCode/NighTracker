<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'link'
  type?: 'button' | 'submit'
  disabled?: boolean
}>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
})

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-amber-200 text-slate-900 font-semibold hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400'
    case 'secondary':
      return 'border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:text-slate-500'
    default:
      return 'text-amber-200 underline underline-offset-4 disabled:text-slate-500'
  }
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex min-h-12 min-w-12 items-center justify-center rounded-lg px-4 py-2 text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 disabled:cursor-not-allowed"
    :class="variantClass"
  >
    <slot />
  </button>
</template>
