// src/modules/04payments/application/ports/payment-provider.port.ts

export interface PaymentProviderPort {
  generatePaymentLink(order: {
    orderId: string;
    total: number;
    items: { productId: string; quantity: number }[];
  }): Promise<{ url: string }>;
}
