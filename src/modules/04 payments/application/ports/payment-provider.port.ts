// modules/04 payments/application/ports/payment-provider.port.ts
export interface PaymentProvider {
  generatePaymentLink(order: {
    orderId: string;
    total: number;
    items: {
      productId: string;
      quantity: number;
    }[];
  }): Promise<{ url: string }>;
}
