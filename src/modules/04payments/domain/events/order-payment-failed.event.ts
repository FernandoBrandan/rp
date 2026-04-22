// modules/04 payments/domain/events/Order.paymentFailed.event.ts
export class OrderPaymentFailedEvent {
  constructor(
    public readonly orderId: string,
    public readonly reason?: string,
  ) {}
}
