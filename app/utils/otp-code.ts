export const OTP_LENGTH = 6
export const OTP_FORMAT_MESSAGE = 'Le code contient 6 chiffres.'

/** Retire espaces et tirets : « 123 456 » et « 123-456 » deviennent « 123456 ». */
export function normalizeOtpCode(input: string): string {
  return input.replace(/[\s-]/g, '')
}

/** Message d'erreur, ou null si la valeur normalisée est exactement 6 chiffres. */
export function validateOtpCode(input: string): string | null {
  return /^\d{6}$/.test(normalizeOtpCode(input)) ? null : OTP_FORMAT_MESSAGE
}
