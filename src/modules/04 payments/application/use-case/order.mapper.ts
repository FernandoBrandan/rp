import { Order } from '@order/domain/order.entity';
import { Money } from '@order/domain/value-objects/money.vo';
import { OrderItem } from '@order/domain/value-objects/orderItem.vo';

export function toDomain(raw: any): Order {
  return Order.create({
    id: raw.id,
    userId: raw.userId,
    idempotencyKey: raw.idempotencyKey,
    items: raw.items.map(
      (i) => new OrderItem(i.productId, i.quantity, new Money(i.price)),
    ),
    reservationId: raw.reservationId,
  });
}
