// src/modules/03order/domain/repositories/order.repository.ts
import { Order } from '../order.entity';

export interface OrderRepository {
  createOrder(order: Order): Promise<void>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrderDetail(id: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
}
