import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LoggerModule } from '@infra/logger/logger.module'
import { LOGGER, PAYMENT_PROVIDER } from '@infra/tokens'
import { Logger } from '@infra/logger/logger.interface'

import { OrderModule } from '@order/order.module'

import { PaymentsController } from './presentation/payments.controller'
import { OrderCreatedListener } from './application/listeners/order-created.listener'
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case'
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case'

import { MercadoPagoProvider } from './infra/providers/mercado-pago.provider'
import { FakePaymentProvider } from './infra/providers/fake-payment.provider'
import { TimedPaymentProvider } from './infra/providerResilience/timed-payment.provider'
import { RetryingPaymentProvider } from './infra/providerResilience/retrying-payment.provider'
import { CircuitBreakingPaymentProvider } from './infra/providerResilience/circuit-breaking-payment.provider'
import { BulkheadedPaymentProvider } from './infra/providerResilience/bulkheaded-payment.provider'

@Module({
  imports: [ConfigModule, LoggerModule, OrderModule],
  controllers: [PaymentsController],
  providers: [
    OrderCreatedListener,
    CreatePaymentLinkUseCase,
    HandleWebhookUseCase,
    FakePaymentProvider,
    MercadoPagoProvider,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService, FakePaymentProvider, MercadoPagoProvider, LOGGER],
      useFactory: (
        config: ConfigService,
        fake: FakePaymentProvider,
        mp: MercadoPagoProvider,
        logger: Logger,
      ) => {
        const selected = config.get<string>('PAYMENT_PROVIDER', 'fake')
        const timeoutMs = Number(config.get<string>('PAYMENT_TIMEOUT_MS', '5000'))

        const retryAttempts = Number(config.get<string>('PAYMENT_RETRY_ATTEMPTS', '3'))
        const retryBaseMs = Number(config.get<string>('PAYMENT_RETRY_BASE_MS', '500'))
        const retryMaxMs = Number(config.get<string>('PAYMENT_RETRY_MAX_MS', '4000'))

        const cbThreshold = Number(config.get<string>('PAYMENT_CB_THRESHOLD', '5'))
        const cbResetMs = Number(config.get<string>('PAYMENT_CB_RESET_MS', '30000'))

        const bhMaxConcurrent = Number(config.get<string>('PAYMENT_BH_MAX_CONCURRENT', '10'))
        const bhMaxQueue = Number(config.get<string>('PAYMENT_BH_MAX_QUEUE', '20'))
        const bhQueueTimeoutMs = Number(config.get<string>('PAYMENT_BH_QUEUE_TIMEOUT_MS', '5000'))

        const inner = selected === 'mercadopago' ? mp : fake

        // Composición: Retry( Timeout( inner ) )
        // Retry por fuera → cada intento tiene su propio timeout
        const timed = new TimedPaymentProvider(inner, timeoutMs, logger)

        const retrying = new RetryingPaymentProvider(
          timed,
          {
            attempts: retryAttempts,
            baseMs: retryBaseMs,
            maxMs: retryMaxMs,
            jitter: true,
          },
          logger,
        )
        const breaking = new CircuitBreakingPaymentProvider(
          retrying,
          { threshold: cbThreshold, resetMs: cbResetMs },
          logger,
        )

        return new BulkheadedPaymentProvider(
          breaking,
          {
            maxConcurrent: bhMaxConcurrent,
            maxQueue: bhMaxQueue,
            queueTimeoutMs: bhQueueTimeoutMs,
          },
          logger,
        )
      },
    },
  ],
})
export class PaymentModule {}

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
