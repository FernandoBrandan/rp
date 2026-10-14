// test/unit/04payments/bulkheaded-payment.provider.spec.ts

import { BulkheadedPaymentProvider } from '@payment/infra/providers/bulkheaded-payment.provider'
import { BulkheadFullError } from '@infra/resilience'
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

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('BulkheadedPaymentProvider', () => {
  it('delega al inner cuando hay capacidad', async () => {
    const inner = makeInner(jest.fn().mockResolvedValue({ url: 'ok' }))
    const provider = new BulkheadedPaymentProvider(
      inner,
      { maxConcurrent: 5, maxQueue: 10 },
      makeLogger() as any,
    )

    const result = await provider.generatePaymentLink(order)

    expect(result.url).toBe('ok')
    expect(inner.generatePaymentLink).toHaveBeenCalledWith(order)
  })

  it('rechaza cuando el bulkhead está saturado (queue full)', async () => {
    const inner = makeInner(() => delay(1000).then(() => ({ url: 'late' })))
    const provider = new BulkheadedPaymentProvider(
      inner,
      { maxConcurrent: 1, maxQueue: 0 },
      makeLogger() as any,
    )

    const blocker = provider.generatePaymentLink(order)

    await expect(provider.generatePaymentLink(order)).rejects.toBeInstanceOf(BulkheadFullError)
    await blocker
  })

  it('loguea event=payment_blocked_by_bulkhead cuando rechaza', async () => {
    const logger = makeLogger()
    const inner = makeInner(() => delay(1000).then(() => ({ url: 'late' })))
    const provider = new BulkheadedPaymentProvider(
      inner,
      { maxConcurrent: 1, maxQueue: 0 },
      logger as any,
    )

    const blocker = provider.generatePaymentLink(order)
    await expect(provider.generatePaymentLink(order)).rejects.toBeInstanceOf(BulkheadFullError)

    expect(logger.warn).toHaveBeenCalledWith(
      'Payment blocked by bulkhead saturation',
      expect.objectContaining({
        event: 'payment_blocked_by_bulkhead',
        orderId: 'ORDER-1',
        reason: 'QUEUE_FULL',
      }),
    )
    await blocker
  })

  it('expone getMetrics()', async () => {
    const inner = makeInner(jest.fn().mockResolvedValue({ url: 'ok' }))
    const provider = new BulkheadedPaymentProvider(
      inner,
      { maxConcurrent: 5, maxQueue: 10 },
      makeLogger() as any,
    )

    const metrics = provider.getMetrics()

    expect(metrics.capacity).toBe(5)
    expect(metrics.queueCapacity).toBe(10)
    expect(metrics.active).toBe(0)
    expect(metrics.queued).toBe(0)
  })
})
