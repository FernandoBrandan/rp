// src/modules/04payments/application/ports/order-payment-status.port.ts
export interface OrderPaymentStatusPort {
  markGenerating(orderId: string): Promise<void>;
  markFailed(orderId: string): Promise<void>;
}
