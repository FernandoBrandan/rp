import { Injectable, Inject } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@infra/tokens';
import { PaymentProviderPort } from '../ports/payment-provider.port';

@Injectable()
export class CreatePaymentLinkUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async execute(order: {
    id: string;
    total: number;
    items: any[];
  }): Promise<string> {
    const result = await this.paymentProvider.generatePaymentLink({
      orderId: order.id,
      total: order.total,
      items: order.items,
    });
    if (!result?.url) throw new Error('Empty payment link');
    return result.url;
  }
}
