import { Module } from '@nestjs/common';

import { LoggerModule } from '@infra/logger/logger.module';
import { PAYMENT_PROVIDER } from '@infra/tokens';

import { PaymentsController } from './presentation/payments.controller';
import { OrderCreatedListener } from './application/listeners/order-created.listener';
import { CreatePaymentLinkUseCase } from './application/use-case/CreatePaymentLink.use-case';
import { PaymentsService } from './application/use-case/handleWebhook.use-case';

import { CatalogModule } from '@catalog/catalog.module';
import { OrderModule } from '@order/order.module';

import { MercadoPagoProvider } from './infra/providers/MercadoPago.provider';
import {
  FakePaymentProvider,
  PaymentApprovedListener,
} from './infra/providers/fake-payment.provider';

const providerPayment =
  process.env.PAYMENT_PROVIDER === 'fake' || null
    ? FakePaymentProvider
    : MercadoPagoProvider;

@Module({
  imports: [LoggerModule, CatalogModule, OrderModule],
  controllers: [PaymentsController],
  providers: [
    OrderCreatedListener,
    CreatePaymentLinkUseCase,
    PaymentApprovedListener,
    PaymentsService,
    {
      provide: PAYMENT_PROVIDER,
      useClass: providerPayment,
    },
  ],
})
export class PaymentModule {}
