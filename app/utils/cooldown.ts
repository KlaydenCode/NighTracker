export const RESEND_COOLDOWN_SECONDS = 60

/** Secondes restantes avant de pouvoir renvoyer un code (heures en ms), jamais négatif. */
export function remainingSeconds(
  sentAt: number,
  now: number,
  durationSeconds: number = RESEND_COOLDOWN_SECONDS,
): number {
  return Math.max(0, Math.ceil((sentAt + durationSeconds * 1000 - now) / 1000))
}
