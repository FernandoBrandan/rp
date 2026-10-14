// test/unit/infra/resilience/timed-payment.provider.spec.ts

import { TimedPaymentProvider } from '@main/modules/04payments/infra/providerResilience/timed-payment.provider'
import { TimeoutError } from '@infra/resilience'
import { PaymentProviderPort } from '@payment/application/ports/payment-provider.port'

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

const order = {
  id: 'ORDER-1',
  total: 200,
  items: [{ productId: 'p', quantity: 1 }],
  status: 'PENDING',
}

function makeInner(impl: PaymentProviderPort['generatePaymentLink']): PaymentProviderPort {
  return { generatePaymentLink: impl }
}

describe('TimedPaymentProvider', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('devuelve el resultado si el provider responde a tiempo', async () => {
    const inner = makeInner(jest.fn().mockResolvedValue({ url: 'http://pay/1' }))
    const provider = new TimedPaymentProvider(inner, 100, makeLogger() as any)

    const result = await provider.generatePaymentLink(order)

    expect(result.url).toBe('http://pay/1')
    expect(inner.generatePaymentLink).toHaveBeenCalledWith(order)
  })

  it('rechaza con TimeoutError si el provider tarda más que el timeout', async () => {
    jest.useFakeTimers()

    const inner = makeInner(
      jest.fn(
        () =>
          new Promise<{ url: string }>((resolve) =>
            setTimeout(() => resolve({ url: 'late' }), 1000),
          ),
      ),
    )
    const provider = new TimedPaymentProvider(inner, 100, makeLogger() as any)

    const pending = provider.generatePaymentLink(order)
    jest.advanceTimersByTime(150)

    await expect(pending).rejects.toBeInstanceOf(TimeoutError)
  })

  it('loguea warn cuando hay timeout', async () => {
    jest.useFakeTimers()
    const logger = makeLogger()

    const inner = makeInner(
      jest.fn(
        () =>
          new Promise<{ url: string }>((resolve) =>
            setTimeout(() => resolve({ url: 'late' }), 1000),
          ),
      ),
    )
    const provider = new TimedPaymentProvider(inner, 100, logger as any)

    const pending = provider.generatePaymentLink(order)
    jest.advanceTimersByTime(150)
    await expect(pending).rejects.toBeInstanceOf(TimeoutError)

    expect(logger.warn).toHaveBeenCalledWith(
      'Payment provider timed out',
      expect.objectContaining({
        event: 'payment_timeout',
        orderId: 'ORDER-1',
        timeoutMs: 100,
      }),
    )
  })

  it('propaga el error original si falla antes del timeout', async () => {
    const inner = makeInner(jest.fn().mockRejectedValue(new Error('provider exploded')))
    const provider = new TimedPaymentProvider(inner, 5000, makeLogger() as any)

    await expect(provider.generatePaymentLink(order)).rejects.toThrow('provider exploded')
  })

  it('no loguea warn si el error no es timeout', async () => {
    const logger = makeLogger()
    const inner = makeInner(jest.fn().mockRejectedValue(new Error('boom')))
    const provider = new TimedPaymentProvider(inner, 5000, logger as any)

    await expect(provider.generatePaymentLink(order)).rejects.toThrow('boom')

    expect(logger.warn).not.toHaveBeenCalled()
  })
})
