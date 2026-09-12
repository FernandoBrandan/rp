import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '@infra/tokens';
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../ports/payment-provider.port';

@Injectable()
export class CreatePaymentLinkUseCase {
  constructor(
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProviderPort,
  ) {}

  async execute(order: PaymentOrderSnapshot): Promise<string> {
    const result = await this.paymentProvider.generatePaymentLink(order);
    if (!result?.url) {
      throw new Error('Payment provider returned an empty URL');
    }
    return result.url;
  }
}
