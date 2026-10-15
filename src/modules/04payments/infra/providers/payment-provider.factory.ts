import { Injectable, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { FakePaymentProvider } from './fake-payment.provider'
import { MercadoPagoProvider } from './mercado-pago.provider'
import { TimedPaymentProvider } from '../providerResilience/timed-payment.provider'
import { RetryingPaymentProvider } from '../providerResilience/retrying-payment.provider'
import { CircuitBreakingPaymentProvider } from '../providerResilience/circuit-breaking-payment.provider'
import { BulkheadedPaymentProvider } from '../providerResilience/bulkheaded-payment.provider'
import { PaymentProviderPort } from '../../application/ports/payment-provider.port'

@Injectable()
export class PaymentProviderFactory {
  public readonly provider: PaymentProviderPort
  public readonly circuitBreaker: CircuitBreakingPaymentProvider

  constructor(
    private readonly config: ConfigService,
    private readonly fake: FakePaymentProvider,
    private readonly mp: MercadoPagoProvider,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    const selected = this.config.get<string>('PAYMENT_PROVIDER', 'fake')
    const timeoutMs = Number(this.config.get<string>('PAYMENT_TIMEOUT_MS', '5000'))

    const retryAttempts = Number(this.config.get<string>('PAYMENT_RETRY_ATTEMPTS', '3'))
    const retryBaseMs = Number(this.config.get<string>('PAYMENT_RETRY_BASE_MS', '500'))
    const retryMaxMs = Number(this.config.get<string>('PAYMENT_RETRY_MAX_MS', '4000'))

    const cbThreshold = Number(this.config.get<string>('PAYMENT_CB_THRESHOLD', '5'))
    const cbResetMs = Number(this.config.get<string>('PAYMENT_CB_RESET_MS', '30000'))

    const bhMaxConcurrent = Number(this.config.get<string>('PAYMENT_BH_MAX_CONCURRENT', '10'))
    const bhMaxQueue = Number(this.config.get<string>('PAYMENT_BH_MAX_QUEUE', '20'))
    const bhQueueTimeoutMs = Number(this.config.get<string>('PAYMENT_BH_QUEUE_TIMEOUT_MS', '5000'))

    const inner = selected === 'mercadopago' ? this.mp : this.fake

    const timed = new TimedPaymentProvider(inner, timeoutMs, this.logger)
    const retrying = new RetryingPaymentProvider(
      timed,
      { attempts: retryAttempts, baseMs: retryBaseMs, maxMs: retryMaxMs, jitter: true },
      this.logger,
    )

    this.circuitBreaker = new CircuitBreakingPaymentProvider(
      retrying,
      { threshold: cbThreshold, resetMs: cbResetMs },
      this.logger,
    )

    this.provider = new BulkheadedPaymentProvider(
      this.circuitBreaker,
      { maxConcurrent: bhMaxConcurrent, maxQueue: bhMaxQueue, queueTimeoutMs: bhQueueTimeoutMs },
      this.logger,
    )
  }
}

/**
 * Versiones
 *
 * return selected === 'mercadopago' ? mp : fake;
 * return new TimedPaymentProvider(inner, timeoutMs, logger);
 * return new RetryingPaymentProvider(
 *              timed,
 *              {   attempts: retryAttempts,
 *                  baseMs: retryBaseMs,
 *                  maxMs: retryMaxMs,
 *                  jitter: true    },
 *              logger,  
 *      )
 * return new CircuitBreakingPaymentProvider(
          retrying,
          { threshold: cbThreshold, resetMs: cbResetMs },
          logger,
        )
 */
