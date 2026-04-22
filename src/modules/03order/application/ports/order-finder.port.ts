// src/modules/03order/application/ports/order-finder.port.ts

export interface OrderFinderPort {
  findById(orderId: string): Promise<{
    id: string;
    total: number;
    items: { productId: string; quantity: number }[];
    status: string;
  } | null>;
}
