/** Style d'un conteneur qui suit la zone visible (clavier ouvert), ou 100dvh avant la mesure. */
export function visibleHeightStyle(
  height: number | null,
  property: 'height' | 'minHeight' = 'height',
): Record<string, string> {
  return { [property]: height ? `${height}px` : '100dvh' }
}
