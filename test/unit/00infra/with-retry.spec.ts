// test/unit/infra/resilience/with-retry.spec.ts
import { withRetry, RetryExhaustedError, defaultShouldRetry, TimeoutError } from '@infra/resilience'

describe('withRetry', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('devuelve el valor sin reintentar si la primera va bien', async () => {
    const fn = jest.fn().mockResolvedValue('ok')

    const result = await withRetry(fn, { attempts: 3 })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('reintenta y devuelve el valor si un intento posterior tiene éxito', async () => {
    jest.useFakeTimers()
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new TimeoutError('op', 100))
      .mockRejectedValueOnce(new TimeoutError('op', 100))
      .mockResolvedValue('ok')

    const promise = withRetry(fn, {
      attempts: 3,
      baseMs: 10,
      maxMs: 100,
      jitter: false,
    })

    await jest.advanceTimersByTimeAsync(10)
    await jest.advanceTimersByTimeAsync(20)

    expect(await promise).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('lanza RetryExhaustedError cuando se agotan los intentos', async () => {
    jest.useFakeTimers()
    const err = new TimeoutError('op', 100)
    const fn = jest.fn().mockRejectedValue(err)

    const promise = withRetry(fn, {
      attempts: 3,
      baseMs: 10,
      maxMs: 100,
      jitter: false,
    })
    const caught = promise.catch((e) => e)

    await jest.advanceTimersByTimeAsync(10)
    await jest.advanceTimersByTimeAsync(20)

    const result = (await caught) as RetryExhaustedError
    expect(result).toBeInstanceOf(RetryExhaustedError)
    expect(result.attempts).toBe(3)
    expect(result.lastError).toBe(err)
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('no reintenta si shouldRetry devuelve false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('validation failed'))

    await expect(withRetry(fn, { attempts: 3, shouldRetry: () => false })).rejects.toBeInstanceOf(
      RetryExhaustedError,
    )

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('llama onRetry con el intento fallido, el error y el delay', async () => {
    jest.useFakeTimers()
    const err = new TimeoutError('op', 100)
    const fn = jest.fn().mockRejectedValueOnce(err).mockResolvedValue('ok')
    const onRetry = jest.fn()

    const promise = withRetry(fn, {
      attempts: 3,
      baseMs: 100,
      maxMs: 1000,
      jitter: false,
      onRetry,
    })

    await jest.advanceTimersByTimeAsync(100)
    await promise

    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, err, 100)
  })

  it('rechaza si attempts < 1', async () => {
    await expect(withRetry(async () => 'x', { attempts: 0 })).rejects.toThrow(
      'attempts must be >= 1',
    )
  })

  describe('defaultShouldRetry', () => {
    it('retrya TimeoutError', () => {
      expect(defaultShouldRetry(new TimeoutError('x', 100))).toBe(true)
    })

    it('retrya errores de red reconocibles', () => {
      expect(defaultShouldRetry(new Error('read ECONNRESET'))).toBe(true)
      expect(defaultShouldRetry(new Error('connect ETIMEDOUT'))).toBe(true)
    })

    it('NO retrya errores de negocio', () => {
      expect(defaultShouldRetry(new Error('Validation failed'))).toBe(false)
    })

    it('NO retrya valores no-Error', () => {
      expect(defaultShouldRetry('string')).toBe(false)
      expect(defaultShouldRetry(null)).toBe(false)
    })
  })

  describe('backoff', () => {
    it('sin jitter, delays son exactos y exponenciales', async () => {
      jest.useFakeTimers()
      const delays: number[] = []
      const err = new TimeoutError('x', 100)
      const fn = jest
        .fn()
        .mockRejectedValueOnce(err)
        .mockRejectedValueOnce(err)
        .mockResolvedValue('ok')

      const promise = withRetry(fn, {
        attempts: 3,
        baseMs: 100,
        maxMs: 10000,
        jitter: false,
        onRetry: (_a, _e, d) => delays.push(d),
      })

      await jest.advanceTimersByTimeAsync(100)
      await jest.advanceTimersByTimeAsync(200)
      await promise

      expect(delays).toEqual([100, 200])
    })

    it('respeta maxMs (cap del backoff)', async () => {
      jest.useFakeTimers()
      const delays: number[] = []
      const err = new TimeoutError('x', 100)
      const fn = jest
        .fn()
        .mockRejectedValueOnce(err)
        .mockRejectedValueOnce(err)
        .mockRejectedValueOnce(err)
        .mockRejectedValueOnce(err)
        .mockResolvedValue('ok')

      const promise = withRetry(fn, {
        attempts: 5,
        baseMs: 100,
        maxMs: 300,
        jitter: false,
        onRetry: (_a, _e, d) => delays.push(d),
      })

      await jest.advanceTimersByTimeAsync(100)
      await jest.advanceTimersByTimeAsync(200)
      await jest.advanceTimersByTimeAsync(300)
      await jest.advanceTimersByTimeAsync(300)
      await promise

      // backoff teórico: 100, 200, 400, 800 → cap 300
      expect(delays).toEqual([100, 200, 300, 300])
    })

    it('con jitter, delays caen en [exp/2, exp]', async () => {
      jest.useFakeTimers()
      const delays: number[] = []
      const err = new TimeoutError('x', 100)
      const fn = jest
        .fn()
        .mockRejectedValueOnce(err)
        .mockRejectedValueOnce(err)
        .mockResolvedValue('ok')

      const promise = withRetry(fn, {
        attempts: 3,
        baseMs: 1000,
        maxMs: 10000,
        jitter: true,
        onRetry: (_a, _e, d) => delays.push(d),
      })

      await jest.advanceTimersByTimeAsync(2000)
      await jest.advanceTimersByTimeAsync(4000)
      await promise

      expect(delays).toHaveLength(2)
      expect(delays[0]).toBeGreaterThanOrEqual(500)
      expect(delays[0]).toBeLessThanOrEqual(1000)
      expect(delays[1]).toBeGreaterThanOrEqual(1000)
      expect(delays[1]).toBeLessThanOrEqual(2000)
    })
  })

  describe('AbortSignal', () => {
    it('aborta antes del primer intento si ya está abortado', async () => {
      const controller = new AbortController()
      controller.abort(new Error('cancelled'))
      const fn = jest.fn()

      await expect(withRetry(fn, { attempts: 3, signal: controller.signal })).rejects.toThrow(
        'cancelled',
      )
      expect(fn).not.toHaveBeenCalled()
    })

    it('corta el sleep si se aborta durante la espera', async () => {
      jest.useFakeTimers()
      const controller = new AbortController()
      const err = new TimeoutError('x', 100)
      const fn = jest.fn().mockRejectedValue(err)

      const promise = withRetry(fn, {
        attempts: 5,
        baseMs: 10000,
        maxMs: 10000,
        jitter: false,
        signal: controller.signal,
      })
      const caught = promise.catch((e) => e)

      await jest.advanceTimersByTimeAsync(0)
      controller.abort(new Error('cancelled mid-wait'))

      const result = (await caught) as Error
      expect(result.message).toBe('cancelled mid-wait')
    })
  })
})
