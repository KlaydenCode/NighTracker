/** Date du jour à Europe/Paris, au format AAAA-MM-JJ, quel que soit le fuseau de la machine. */
export function todayInParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function parseDate(value: string): { year: number, month: number, day: number } {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  return { year, month, day }
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Mois révolus entre la naissance et aujourd'hui. Le jour anniversaire du mois est
 * min(jour de naissance, dernier jour du mois courant). Négatif si la naissance est future.
 */
export function ageInMonths(birthDate: string, today: string): number {
  const b = parseDate(birthDate)
  const t = parseDate(today)
  let months = (t.year - b.year) * 12 + (t.month - b.month)
  if (t.day < Math.min(b.day, daysInMonth(t.year, t.month))) months -= 1
  return months
}

/** « Moins d'un mois », « N mois » (avant 24 mois), puis « N ans » ou « N ans et M mois ». */
export function formatAge(birthDate: string, today: string): string {
  if (birthDate > today) return ''
  const months = ageInMonths(birthDate, today)
  if (months < 0) return ''
  if (months === 0) return 'Moins d\'un mois'
  if (months < 24) return `${months} mois`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest === 0 ? `${years} ans` : `${years} ans et ${rest} mois`
}
