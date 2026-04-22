// src/modules/03order/domain/events/order-created.event.ts
export class OrderCreatedEvent {
  constructor(public readonly orderId: string) {}
}
