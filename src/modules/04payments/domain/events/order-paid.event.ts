// modules/04 payments/domain/events/order.paid.event.ts
export class OrderPaidEvent {
  constructor(public readonly orderId: string) {}
}
