import { describe, expect, it } from 'vitest'
import { runWithNeutralDelay } from './neutral-delay'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function setup(isCurrent: () => boolean = () => true) {
  const calls: string[] = []
  const sleeper = deferred<undefined>()
  const request = deferred<'sent' | 'offline'>()
  const done = runWithNeutralDelay({
    request: request.promise,
    isCurrent,
    onOffline: () => {
      calls.push('offline')
    },
    onDone: () => {
      calls.push('done')
    },
    sleep: () => sleeper.promise,
  })
  return { calls, sleeper, request, done }
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0))

describe('runWithNeutralDelay', () => {
  it('passe à la suite à la fin du délai, sans attendre la réponse', async () => {
    const { calls, sleeper, done } = setup()
    await tick()
    expect(calls).toEqual([])
    sleeper.resolve(undefined)
    await done
    expect(calls).toEqual(['done'])
  })

  it('donne le même résultat que la réponse arrive avant ou après le délai', async () => {
    const early = setup()
    early.request.resolve('sent')
    await tick()
    early.sleeper.resolve(undefined)
    await early.done

    const late = setup()
    late.sleeper.resolve(undefined)
    await late.done
    late.request.resolve('sent')
    await tick()

    expect(early.calls).toEqual(['done'])
    expect(late.calls).toEqual(['done'])
  })

  it('signale une absence de réponse réseau', async () => {
    const { calls, request } = setup()
    request.resolve('offline')
    await tick()
    expect(calls).toEqual(['offline'])
  })

  it('ne fait rien si la demande a été abandonnée', async () => {
    let current = true
    const { calls, sleeper, request, done } = setup(() => current)
    current = false
    request.resolve('offline')
    sleeper.resolve(undefined)
    await done
    expect(calls).toEqual([])
  })
})
