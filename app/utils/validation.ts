import { isValidEmail } from './email'

// Règles de saisie de l'app. Chaque fonction renvoie le message d'erreur, ou null si la valeur est valide.

export const FIRST_NAME_MAX = 50
export const HOUSEHOLD_NAME_MAX = 50
export const DISPLAY_NAME_MAX = 30

function validateText(value: string, max: number, required: string): string | null {
  const length = value.trim().length
  if (length === 0) return required
  if (length > max) return `${max} caractères maximum.`
  return null
}

export function validateFirstName(value: string): string | null {
  return validateText(value, FIRST_NAME_MAX, 'Le prénom est obligatoire.')
}

export function validateHouseholdName(value: string): string | null {
  return validateText(value, HOUSEHOLD_NAME_MAX, 'Le nom du foyer est obligatoire.')
}

export function validateDisplayName(value: string): string | null {
  return validateText(value, DISPLAY_NAME_MAX, 'Le nom d\'affichage est obligatoire.')
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function validateBirthDate(value: string, today: string): string | null {
  if (!value.trim()) return 'La date de naissance est obligatoire.'
  if (!isRealDate(value)) return 'Date invalide.'
  if (value > today) return 'La date ne peut pas être dans le futur.'
  return null
}

/** Seuls Maman et Papa sont proposés : « autre » (nounou, lot 9) est refusé. */
export function validateRole(value: string | null): string | null {
  return value === 'maman' || value === 'papa' ? null : 'Choisissez votre rôle.'
}

export function validateEmail(value: string): string | null {
  return isValidEmail(value) ? null : 'Adresse email invalide'
}
