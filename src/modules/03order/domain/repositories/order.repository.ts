// src/modules/03order/domain/repositories/order.repository.ts
import { OrderStatus } from '../enums/orderStatus.enum'
import { Order } from '../order.entity'

export interface OrderRepository {
  createOrder(order: Order): Promise<void>
  getOrdersByUser(userId: string): Promise<Order[]>
  getOrderDetail(id: string): Promise<Order | null>
  update(order: Order): Promise<void>
  findByIdempotencyKey(key: string): Promise<Order | null>

  /** Órdenes en alguno de los estados dados, actualizadas desde `since`. Ordenadas por updatedAt ASC. */
  findRecentByStatuses(statuses: OrderStatus[], since: Date, limit: number): Promise<Order[]>
}
