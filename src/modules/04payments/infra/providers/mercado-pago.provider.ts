// modules/04 payments/infra/providers/MercadoPago.provider.ts

import { Inject, Injectable } from '@nestjs/common';
import { PaymentProviderPort } from '@payment/application/ports/payment-provider.port';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';

@Injectable()
export class MercadoPagoProvider implements PaymentProviderPort {
  constructor(
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}
  generatePaymentLink(order: {
    orderId: string;
    total: number;
    items: { productId: string; quantity: number }[];
  }): Promise<{ url: string }> {
    this.logger.info('MercadoPagoProvider - generatePaymentLink');
    throw new Error('Method not implemented.');
  }
}
