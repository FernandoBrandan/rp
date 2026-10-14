// src/modules/04payments/infra/providers/retrying-payment.provider.ts

import { Logger } from '@infra/logger/logger.interface'
import { withRetry, RetryOptions } from '@infra/resilience'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port'

/**
 * Decorator: envuelve cualquier PaymentProviderPort con retry.
 * Debe ir POR FUERA de TimedPaymentProvider para que cada intento
 * tenga su propio timeout (no un timeout global compartido).
 */
export class RetryingPaymentProvider implements PaymentProviderPort {
  constructor(
    private readonly inner: PaymentProviderPort,
    private readonly options: Omit<RetryOptions, 'onRetry'>,
    private readonly logger: Logger,
  ) {}

  async generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }> {
    return withRetry(() => this.inner.generatePaymentLink(order), {
      ...this.options,
      onRetry: (attempt, err, delayMs) => {
        this.logger.warn('Payment retry scheduled', {
          event: 'payment_retry',
          orderId: order.id,
          attempt,
          delayMs,
          reason: err instanceof Error ? err.message : String(err),
        })
      },
    })
  }
}
