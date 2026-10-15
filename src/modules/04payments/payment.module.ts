import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LoggerModule } from '@infra/logger/logger.module'
import { LOGGER, PAYMENT_CIRCUIT_BREAKER_HEALTH, PAYMENT_PROVIDER } from '@infra/tokens'
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
import { PaymentProviderFactory } from './infra/providers/payment-provider.factory'

@Module({
  imports: [ConfigModule, LoggerModule, OrderModule],
  controllers: [PaymentsController],
  providers: [
    OrderCreatedListener,
    CreatePaymentLinkUseCase,
    HandleWebhookUseCase,
    FakePaymentProvider,
    MercadoPagoProvider,
    PaymentProviderFactory,
    {
      provide: PAYMENT_PROVIDER,
      inject: [PaymentProviderFactory],
      useFactory: (factory: PaymentProviderFactory) => factory.provider,
    },
    {
      provide: PAYMENT_CIRCUIT_BREAKER_HEALTH,
      useFactory: (factory: PaymentProviderFactory) => factory.circuitBreaker,
      inject: [PaymentProviderFactory],
    },
  ],
})
export class PaymentModule {}
