// test/unit/04payments/retrying-payment.provider.spec.ts
import { RetryingPaymentProvider } from '@main/modules/04payments/infra/providerResilience/retrying-payment.provider'
import { TimedPaymentProvider } from '@main/modules/04payments/infra/providerResilience/timed-payment.provider'
import { RetryExhaustedError, TimeoutError } from '@infra/resilience'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '@payment/application/ports/payment-provider.port'

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

const order: PaymentOrderSnapshot = {
  id: 'ORDER-1',
  total: 200,
  items: [{ productId: 'p', quantity: 1 }],
  status: 'PENDING',
}

function makeInner(impl: PaymentProviderPort['generatePaymentLink']): PaymentProviderPort {
  return { generatePaymentLink: impl }
}

describe('RetryingPaymentProvider', () => {
  afterEach(() => jest.useRealTimers())

  it('devuelve OK sin retry si el primero va bien', async () => {
    const inner = makeInner(jest.fn().mockResolvedValue({ url: 'ok' }))
    const logger = makeLogger()
    const provider = new RetryingPaymentProvider(
      inner,
      { attempts: 3, baseMs: 10, jitter: false },
      logger as any,
    )

    const result = await provider.generatePaymentLink(order)

    expect(result.url).toBe('ok')
    expect(inner.generatePaymentLink).toHaveBeenCalledTimes(1)
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('reintenta y devuelve OK si un intento posterior tiene éxito', async () => {
    jest.useFakeTimers()
    const inner = makeInner(
      jest.fn().mockRejectedValueOnce(new TimeoutError('op', 100)).mockResolvedValue({ url: 'ok' }),
    )
    const provider = new RetryingPaymentProvider(
      inner,
      { attempts: 3, baseMs: 10, maxMs: 100, jitter: false },
      makeLogger() as any,
    )

    const promise = provider.generatePaymentLink(order)
    await jest.advanceTimersByTimeAsync(10)

    expect(await promise).toEqual({ url: 'ok' })
    expect(inner.generatePaymentLink).toHaveBeenCalledTimes(2)
  })

  it('loguea event=payment_retry en cada reintento', async () => {
    jest.useFakeTimers()
    const logger = makeLogger()
    const inner = makeInner(
      jest.fn().mockRejectedValueOnce(new TimeoutError('op', 100)).mockResolvedValue({ url: 'ok' }),
    )
    const provider = new RetryingPaymentProvider(
      inner,
      { attempts: 3, baseMs: 100, maxMs: 1000, jitter: false },
      logger as any,
    )

    const promise = provider.generatePaymentLink(order)
    await jest.advanceTimersByTimeAsync(100)
    await promise

    expect(logger.warn).toHaveBeenCalledWith(
      'Payment retry scheduled',
      expect.objectContaining({
        event: 'payment_retry',
        orderId: 'ORDER-1',
        attempt: 1,
        delayMs: 100,
      }),
    )
  })

  it('NO reintenta errores no-retryables (default shouldRetry)', async () => {
    const inner = makeInner(jest.fn().mockRejectedValue(new Error('validation failed')))
    const provider = new RetryingPaymentProvider(
      inner,
      { attempts: 3, baseMs: 10, jitter: false },
      makeLogger() as any,
    )

    await expect(provider.generatePaymentLink(order)).rejects.toBeInstanceOf(RetryExhaustedError)
    expect(inner.generatePaymentLink).toHaveBeenCalledTimes(1)
  })

  it('agota los intentos y lanza RetryExhaustedError', async () => {
    jest.useFakeTimers()
    const inner = makeInner(jest.fn().mockRejectedValue(new TimeoutError('op', 100)))
    const provider = new RetryingPaymentProvider(
      inner,
      { attempts: 3, baseMs: 10, maxMs: 100, jitter: false },
      makeLogger() as any,
    )

    const promise = provider.generatePaymentLink(order)
    const caught = promise.catch((e) => e)

    await jest.advanceTimersByTimeAsync(10)
    await jest.advanceTimersByTimeAsync(20)

    const result = await caught
    expect(result).toBeInstanceOf(RetryExhaustedError)
    expect(inner.generatePaymentLink).toHaveBeenCalledTimes(3)
  })

  it('integración: timeout corto + delay largo agota los reintentos', async () => {
    // Sin fake timers — duraciones reales muy cortas
    const innerProvider = makeInner(
      () => new Promise((resolve) => setTimeout(() => resolve({ url: 'late' }), 1000)),
    )
    const timed = new TimedPaymentProvider(innerProvider, 20, makeLogger() as any)
    const retrying = new RetryingPaymentProvider(
      timed,
      { attempts: 3, baseMs: 5, maxMs: 20, jitter: false },
      makeLogger() as any,
    )

    await expect(retrying.generatePaymentLink(order)).rejects.toBeInstanceOf(RetryExhaustedError)
  })
})
