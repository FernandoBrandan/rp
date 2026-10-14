// src/modules/04payments/infra/providers/circuit-breaking-payment.provider.ts

import { Logger } from '@infra/logger/logger.interface'
import { CircuitBreaker, CircuitBreakerOptions, CircuitOpenError } from '@infra/resilience'
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port'

/**
 * Decorator: envuelve cualquier PaymentProviderPort con un circuit breaker.
 * Debe ir POR FUERA de Timed y Retrying: cada "exec" del breaker es
 * una secuencia completa de retries. Si la secuencia falla entera, cuenta 1.
 */
export class CircuitBreakingPaymentProvider implements PaymentProviderPort {
  private readonly breaker: CircuitBreaker

  constructor(
    private readonly inner: PaymentProviderPort,
    options: Omit<CircuitBreakerOptions, 'onStateChange' | 'onRejected'>,
    private readonly logger: Logger,
  ) {
    this.breaker = new CircuitBreaker({
      ...options,
      name: 'payment-provider',
      onStateChange: (from, to, reason) => {
        logger.warn('Circuit breaker state change', {
          event: 'circuit_state_change',
          circuit: 'payment-provider',
          from,
          to,
          reason,
        })
      },
      onRejected: (reason, ageMs) => {
        logger.warn('Circuit breaker rejected request', {
          event: 'circuit_rejected',
          circuit: 'payment-provider',
          reason,
          openedAgoMs: ageMs,
        })
      },
    })
  }

  async generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }> {
    try {
      return await this.breaker.exec(() => this.inner.generatePaymentLink(order))
    } catch (err) {
      if (err instanceof CircuitOpenError) {
        // Enriquecemos el error con el orderId para correlación
        this.logger.warn('Payment blocked by open circuit', {
          event: 'payment_blocked_by_circuit',
          orderId: order.id,
          openedAgoMs: err.openedAgoMs,
        })
      }
      throw err
    }
  }

  getMetrics() {
    return this.breaker.getMetrics()
  }

  /** Solo para tests y health checks */
  getState() {
    return this.breaker.getState()
  }
}
