// src/modules/03order/domain/events/order-paid.event.ts
export class OrderPaidEvent {
  constructor(public readonly orderId: string) {}
}
