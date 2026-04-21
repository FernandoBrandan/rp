export class PaymentLinkCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly paymentUrl: string,
  ) {}
}
