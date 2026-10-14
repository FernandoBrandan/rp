// src/modules/04payments/infra/providers/bulkheaded-payment.provider.ts

import { Logger } from '@infra/logger/logger.interface'
import { Bulkhead, BulkheadFullError, BulkheadOptions } from '@infra/resilience'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port'

/**
 * Decorator: envuelve cualquier PaymentProviderPort con un bulkhead.
 * Va POR FUERA del circuit breaker: la saturación local no debe contar
 * como fallo del provider externo.
 *
 * Composición final:
 *   Bulkhead( Breaker( Retry( Timeout( inner ) ) ) )
 */
export class BulkheadedPaymentProvider implements PaymentProviderPort {
  private readonly bulkhead: Bulkhead

  constructor(
    private readonly inner: PaymentProviderPort,
    options: Omit<BulkheadOptions, 'onRejected' | 'onExec'>,
    private readonly logger: Logger,
  ) {
    this.bulkhead = new Bulkhead({
      ...options,
      name: 'payment-provider',
      onRejected: (reason, queueSize) => {
        logger.warn('Payment bulkhead rejected request', {
          event: 'payment_bulkhead_rejected',
          bulkhead: 'payment-provider',
          reason,
          queueSize,
        })
      },
      onExec: (active, queued) => {
        // Solo logueamos cuando hay presión real
        if (queued > 0 || active >= (options.maxConcurrent ?? 10)) {
          logger.debug('Payment bulkhead status', {
            event: 'payment_bulkhead_status',
            active,
            queued,
          })
        }
      },
    })
  }

  async generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }> {
    try {
      return await this.bulkhead.exec(() => this.inner.generatePaymentLink(order))
    } catch (err) {
      if (err instanceof BulkheadFullError) {
        this.logger.warn('Payment blocked by bulkhead saturation', {
          event: 'payment_blocked_by_bulkhead',
          orderId: order.id,
          reason: err.reason,
          queueSize: err.queueSize,
        })
      }
      throw err
    }
  }

  getMetrics() {
    return this.bulkhead.getMetrics()
  }
}
