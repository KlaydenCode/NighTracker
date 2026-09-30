export const NEUTRAL_DELAY_MS = 1500

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Demande d'envoi d'un code avec un délai d'affichage fixe : l'écran passe à la suite au bout de
 * `delayMs`, sans attendre la réponse, donc au même moment pour toute adresse (l'app ne révèle pas
 * qui est autorisé). Seule une absence de réponse réseau interrompt le parcours.
 */
export async function runWithNeutralDelay(options: {
  request: Promise<'sent' | 'offline'>
  isCurrent: () => boolean
  onOffline: () => void | Promise<void>
  onDone: () => void | Promise<void>
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
}): Promise<void> {
  const { request, isCurrent, onOffline, onDone, delayMs = NEUTRAL_DELAY_MS, sleep = wait } = options
  void request.then(async (result) => {
    if (result === 'offline' && isCurrent()) await onOffline()
  })
  await sleep(delayMs)
  if (!isCurrent()) return
  await onDone()
}
