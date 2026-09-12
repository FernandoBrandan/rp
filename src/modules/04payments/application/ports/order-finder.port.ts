// src/modules/04payments/application/ports/order-finder.port.ts

export interface OrderFinderPort {
  findById(orderId: string): Promise<any>;
}
