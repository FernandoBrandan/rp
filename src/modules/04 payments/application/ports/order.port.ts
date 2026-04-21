// modules/04 payments/application/ports/order.port.ts
export interface OrderRepository {
  findById(orderId: string): Promise<{
    id: string;
    total: number; // Simplificado a number
    items: { productId: string; quantity: number }[];
    status: string;
  } | null>;
}
