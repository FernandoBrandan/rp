// infra/persistence/order.mapper.ts
import { Order } from '../../domain/order.entity';
import { Money } from '../../domain/value-objects/money.vo';
import { OrderItem } from '../../domain/value-objects/orderItem.vo';
import { OrderStatus } from '../../domain/value-objects/orderStatus.vo';
import { OrderEntity } from './order.orm-entity';

export class OrderMapper {
  static toDomain(orm: OrderEntity): Order {
    const statusMap: Record<string, OrderStatus> = {
      PENDING: OrderStatus.PENDING,
      PAID: OrderStatus.PAID,
      COMPLETED: OrderStatus.COMPLETED,
      FAILED: OrderStatus.FAILED,
      CANCELLED: OrderStatus.CANCELLED,
    };

    const status = statusMap[orm.status] || OrderStatus.PENDING;

    return new Order(
      orm.id,
      orm.userId,
      orm.idempotencyKey,

      orm.items.map(
        (item) =>
          new OrderItem(item.productId, item.quantity, new Money(item.price)),
      ),
      new Money(orm.total),
      status,
      orm.paymentUrl,
    );
  }

  static toPersistence(domain: Order): Partial<OrderEntity> {
    return {
      id: domain.id,
      userId: domain.userId,
      idempotencyKey: domain.idempotencyKey,
      items: domain.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.getValue(),
      })),
      total: domain.total.getValue(),
      status: domain.status,
      paymentUrl: domain.paymentUrl,
    };
  }
}
