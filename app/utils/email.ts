/** Adresse email nettoyée : espaces retirés aux extrémités, minuscules. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase()
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Vrai si la valeur (une fois normalisée) a la forme d'une adresse email. */
export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email)
  return value.length <= 254 && EMAIL_PATTERN.test(value)
}
