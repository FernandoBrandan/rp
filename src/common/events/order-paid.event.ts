// src/common/events/order-paid.event.ts
export class OrderPaidEvent {
  constructor(public readonly orderId: string) {}
}
