import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LoggerModule } from '@infra/logger/logger.module';
import { PAYMENT_PROVIDER } from '@infra/tokens';
import { OrderModule } from '@order/order.module';
import { PaymentsController } from './presentation/payments.controller';
import { OrderCreatedListener } from './application/listeners/order-created.listener';
import { CreatePaymentLinkUseCase } from './application/use-cases/create-payment-link.use-case';
import { HandleWebhookUseCase } from './application/use-cases/handle-webhook.use-case';
import { MercadoPagoProvider } from './infra/providers/mercado-pago.provider';
import { FakePaymentProvider } from './infra/providers/fake-payment.provider';

// const providerPayment =
//   process.env.PAYMENT_PROVIDER === 'fake'
//     ? FakePaymentProvider
//     : MercadoPagoProvider;

const providerPayment = FakePaymentProvider;

@Module({
  imports: [
    BullModule.registerQueue({ name: 'payment-link' }),
    LoggerModule,
    OrderModule,
  ],
  controllers: [PaymentsController],
  providers: [
    OrderCreatedListener,
    CreatePaymentLinkUseCase,
    HandleWebhookUseCase,
    { provide: PAYMENT_PROVIDER, useClass: providerPayment },
  ],
})
export class PaymentModule {}
