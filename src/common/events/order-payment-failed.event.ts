// src/modules/03order/domain/events/order-payment-failed.event.ts
export class OrderPaymentFailedEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason?: string,
  ) {}
}
