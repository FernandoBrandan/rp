import { Injectable, Inject } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@infra/tokens';

import { PaymentProvider } from '../ports/payment-provider.port';
import { Order } from '@order/domain/order.entity';

@Injectable()
export class CreatePaymentLinkUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentService: PaymentProvider,
  ) {}

  async execute(order: Order): Promise<string> {
    const payment = await this.paymentService.generatePaymentLink({
      orderId: order.id,
      total: order.total.getValue(),
      items: order.items,
    });

    if (!payment?.url) {
      throw new Error('Empty payment link');
    }

    return payment.url;
  }
}
