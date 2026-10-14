// test/unit/infra/resilience/with-timeout.spec.ts

import { withTimeout, TimeoutError } from '@infra/resilience'

describe('withTimeout', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('devuelve el valor si resuelve a tiempo', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 100, 'fast')

    expect(result).toBe('ok')
  })

  it('rechaza con TimeoutError si tarda demasiado', async () => {
    jest.useFakeTimers()

    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('too late'), 500))

    const pending = withTimeout(slow, 100, 'payment.generateLink')

    jest.advanceTimersByTime(150)

    await expect(pending).rejects.toBeInstanceOf(TimeoutError)
    await expect(pending).rejects.toThrow('Timeout after 100ms: payment.generateLink')
  })

  it('propaga el error original si rechaza antes del timeout', async () => {
    const failing = Promise.reject(new Error('boom'))

    await expect(withTimeout(failing, 100, 'x')).rejects.toThrow('boom')
  })

  it('no deja UnhandledPromiseRejection si el promise rechaza tras el timeout', async () => {
    jest.useFakeTimers()

    let originalRejected = false
    const slow = new Promise<string>((_, reject) =>
      setTimeout(() => {
        originalRejected = true
        reject(new Error('late failure'))
      }, 500),
    )

    const pending = withTimeout(slow, 100, 'x')
    jest.advanceTimersByTime(150)

    await expect(pending).rejects.toBeInstanceOf(TimeoutError)

    // Avanzamos para que la promesa original rechace
    jest.advanceTimersByTime(400)
    await Promise.resolve() // dejamos procesar el catch

    expect(originalRejected).toBe(true)
    // Si no hubiera `.catch()` en el finally, jest reportaría unhandled
  })

  it('rechaza con error claro si timeoutMs <= 0', async () => {
    await expect(withTimeout(Promise.resolve(1), 0, 'x')).rejects.toThrow(
      'withTimeout: timeoutMs must be > 0',
    )
  })
})
