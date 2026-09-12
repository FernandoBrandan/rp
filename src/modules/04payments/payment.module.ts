import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@infra/logger/logger.module';
import { PAYMENT_PROVIDER } from '@infra/tokens';
import { OrderModule } from '@order/order.module';
import { PaymentsController } from './presentation/payments.controller';
import { OrderCreatedListener } from './application/listeners/order-created.listener';
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { MercadoPagoProvider } from './infra/providers/mercado-pago.provider';
import { FakePaymentProvider } from './infra/providers/fake-payment.provider';

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
      inject: [ConfigService, FakePaymentProvider, MercadoPagoProvider],
      useFactory: (
        config: ConfigService,
        fake: FakePaymentProvider,
        mp: MercadoPagoProvider,
      ) => {
        const selected = config.get<string>('PAYMENT_PROVIDER', 'fake');
        return selected === 'mercadopago' ? mp : fake;
      },
    },
  ],
})
export class PaymentModule {}
