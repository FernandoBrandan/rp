// src/modules/04payments/application/ports/payment-provider.port.ts

export interface PaymentOrderSnapshot {
  id: string;
  total: number;
  items: { productId: string; quantity: number }[];
  status: string;
  paymentUrl?: string;
}

export interface PaymentProviderPort {
  generatePaymentLink(order: PaymentOrderSnapshot): Promise<{ url: string }>;
}
