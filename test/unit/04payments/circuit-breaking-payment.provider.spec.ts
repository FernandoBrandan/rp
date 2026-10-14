// test/unit/04payments/circuit-breaking-payment.provider.spec.ts
import { CircuitBreakingPaymentProvider } from '@main/modules/04payments/infra/providerResilience/circuit-breaking-payment.provider'
import { CircuitOpenError, TimeoutError } from '@infra/resilience'
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

describe('CircuitBreakingPaymentProvider', () => {
  it('delega al inner cuando el circuit está CLOSED', async () => {
    const inner = makeInner(jest.fn().mockResolvedValue({ url: 'ok' }))
    const provider = new CircuitBreakingPaymentProvider(
      inner,
      { threshold: 3, resetMs: 1000 },
      makeLogger() as any,
    )

    const result = await provider.generatePaymentLink(order)

    expect(result.url).toBe('ok')
    expect(provider.getState()).toBe('CLOSED')
  })

  it('abre el circuit tras threshold fallos y rechaza la siguiente', async () => {
    const inner = makeInner(jest.fn().mockRejectedValue(new TimeoutError('op', 100)))
    const provider = new CircuitBreakingPaymentProvider(
      inner,
      { threshold: 2, resetMs: 60_000 },
      makeLogger() as any,
    )

    await expect(provider.generatePaymentLink(order)).rejects.toThrow()
    await expect(provider.generatePaymentLink(order)).rejects.toThrow()

    expect(provider.getState()).toBe('OPEN')

    const fn = jest.fn().mockResolvedValue({ url: 'never' })
    const inner2 = makeInner(fn)
    const provider = new CircuitBreakingPaymentProvider(
      inner2,
      { threshold: 2, resetMs: 60_000 },
      makeLogger() as any,
    )
    // (usa el mismo provider)
    await expect(provider.generatePaymentLink(order)).rejects.toBeInstanceOf(CircuitOpenError)
  })

  it('loguea circuit_state_change al abrir', async () => {
    const logger = makeLogger()
    const inner = makeInner(jest.fn().mockRejectedValue(new TimeoutError('op', 100)))
    const provider = new CircuitBreakingPaymentProvider(
      inner,
      { threshold: 1, resetMs: 60_000 },
      logger as any,
    )

    await expect(provider.generatePaymentLink(order)).rejects.toThrow()

    expect(logger.warn).toHaveBeenCalledWith(
      'Circuit breaker state change',
      expect.objectContaining({
        event: 'circuit_state_change',
        circuit: 'payment-provider',
        from: 'CLOSED',
        to: 'OPEN',
      }),
    )
  })

  it('loguea payment_blocked_by_circuit cuando rechaza', async () => {
    const logger = makeLogger()
    const inner = makeInner(jest.fn().mockRejectedValue(new TimeoutError('op', 100)))
    const provider = new CircuitBreakingPaymentProvider(
      inner,
      { threshold: 1, resetMs: 60_000 },
      logger as any,
    )

    await expect(provider.generatePaymentLink(order)).rejects.toThrow()
    await expect(provider.generatePaymentLink(order)).rejects.toBeInstanceOf(CircuitOpenError)

    expect(logger.warn).toHaveBeenCalledWith(
      'Payment blocked by open circuit',
      expect.objectContaining({
        event: 'payment_blocked_by_circuit',
        orderId: 'ORDER-1',
      }),
    )
  })
})
