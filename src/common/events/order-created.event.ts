// src/common/events/order-created.event.ts
export class OrderCreatedEvent {
  constructor(public readonly orderId: string) {}
}
