// src/modules/04payments/application/ports/order-finder.port.ts

import { PaymentOrderSnapshot } from './payment-provider.port';

export interface OrderFinderPort {
  findById(orderId: string): Promise<PaymentOrderSnapshot | null>;
}
