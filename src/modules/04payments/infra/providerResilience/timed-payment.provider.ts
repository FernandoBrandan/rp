// src/modules/04payments/infra/providers/timed-payment.provider.ts

import { Logger } from '@infra/logger/logger.interface'
import { withTimeout, TimeoutError } from '@infra/resilience'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port'

/**
 * Decorator: envuelve cualquier PaymentProviderPort con un timeout explícito.
 * No es @Injectable — se construye a mano en el factory del módulo,
 * porque envuelve un provider elegido dinámicamente por config.
 */
export class TimedPaymentProvider implements PaymentProviderPort {
  constructor(
    private readonly inner: PaymentProviderPort,
    private readonly timeoutMs: number,
    private readonly logger: Logger,
  ) {}

  async generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }> {
    const start = Date.now()

    try {
      const result = await withTimeout(
        this.inner.generatePaymentLink(order),
        this.timeoutMs,
        'payment.generatePaymentLink',
      )

      this.logger.debug('Payment provider responded', {
        event: 'payment_provider_ok',
        orderId: order.id,
        durationMs: Date.now() - start,
      })

      return result
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.logger.warn('Payment provider timed out', {
          event: 'payment_timeout',
          orderId: order.id,
          timeoutMs: this.timeoutMs,
        })
      }
      throw err
    }
  }
}
