import { isValidEmail } from './email'

export const PENDING_LOGIN_KEY = 'carnet-de-nuits:connexion-en-attente'
export const PENDING_LOGIN_VALIDITY_SECONDS = 900

export interface PendingLogin {
  email: string
  sentAt: number
}

/** État « code demandé » (adresse et heure d'envoi, en ms), à ranger dans localStorage. */
export function serializePendingLogin(value: PendingLogin): string {
  return JSON.stringify({ email: value.email, sentAt: value.sentAt })
}

/** Relit l'état ; null s'il est absent, illisible, invalide ou plus vieux que la validité du code. */
export function parsePendingLogin(
  raw: string | null,
  now: number,
  validitySeconds: number = PENDING_LOGIN_VALIDITY_SECONDS,
): PendingLogin | null {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  }
  catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { email, sentAt } = data as Record<string, unknown>
  if (typeof email !== 'string' || typeof sentAt !== 'number' || !Number.isFinite(sentAt)) return null
  if (!isValidEmail(email)) return null
  const age = now - sentAt
  if (age < 0 || age >= validitySeconds * 1000) return null
  return { email, sentAt }
}
