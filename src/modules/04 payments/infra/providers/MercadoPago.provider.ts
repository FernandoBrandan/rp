// modules/04 payments/infra/providers/MercadoPago.provider.ts

import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../../application/ports/payment-provider.port';

@Injectable()
export class MercadoPagoProvider implements PaymentProvider {
  generatePaymentLink(order: {
    orderId: string;
    total: number;
    items: { productId: string; quantity: number }[];
  }): Promise<{ url: string }> {
    throw new Error('Method not implemented.');
  }
  // async createPaymentLink(input: CreatePaymentDto): Promise<PaymentLink> {
  //   // implementación real
  // }
}
