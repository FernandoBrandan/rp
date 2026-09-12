// src/modules/03order/domain/events/payment-link-created.event.ts
export class PaymentLinkCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly paymentUrl: string,
  ) {}
}
