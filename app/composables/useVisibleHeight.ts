/**
 * Hauteur de la zone visible, en pixels (null avant le montage). Sur iOS le clavier recouvre le bas
 * de la page sans la redimensionner : `visualViewport` donne la hauteur réellement visible.
 */
export function useVisibleHeight() {
  const height = ref<number | null>(null)

  function update(): void {
    height.value = Math.round(window.visualViewport?.height ?? window.innerHeight)
  }

  onMounted(() => {
    update()
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)
  })

  onBeforeUnmount(() => {
    window.visualViewport?.removeEventListener('resize', update)
    window.removeEventListener('resize', update)
  })

  return height
}
