const ROLE_LABELS: Record<string, string> = {
  maman: 'Maman',
  papa: 'Papa',
  autre: 'Autre',
}

/** Libellé français d'un rôle (« maman » devient « Maman »). */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

/**
 * Date en français (« 15 mars 2025 »). Une date seule (AAAA-MM-JJ) est affichée telle quelle ;
 * un horodatage est converti à Europe/Paris.
 */
export function formatDateFr(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = dateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: dateOnly ? 'UTC' : 'Europe/Paris',
  }).format(date)
}
