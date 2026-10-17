import { Order } from '@main/modules/03order/domain/order.entity'
import { Money } from '@main/common/domain/value-objects/money.vo'
import { OrderItem } from '@order/domain/value-objects/orderItem.vo'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'
import { PaymentStatus } from '@order/domain/enums/paymentStatus.enum'
import { OrderEntity } from './order.orm-entity'
import { Currency } from '@main/common/domain/value-objects/currency.vo'

export class OrderOrmMapper {
  static toDomain(orm: OrderEntity): Order {
    const status = orm.status as OrderStatus
    if (!Object.values(OrderStatus).includes(status)) {
      throw new Error(`Unknown order status in DB: ${orm.status}`)
    }
    const currency = Currency.from(orm.currency)

    return new Order(
      orm.id,
      orm.userId,
      orm.idempotencyKey,
      orm.items.map(
        (item) => new OrderItem(item.productId, item.quantity, Money.of(item.price, currency)),
      ),
      Money.of(orm.total, currency),
      status,
      orm.reservationId,
      orm.paymentStatus as PaymentStatus,
      orm.paymentUrl,
    )
  }

  static toPersistence(domain: Order): Partial<OrderEntity> {
    return {
      id: domain.id,
      userId: domain.userId,
      idempotencyKey: domain.idempotencyKey,
      items: domain.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toNumber(),
      })),
      total: domain.total.toNumber(),
      currency: domain.currency.toString(),
      status: domain.status,
      reservationId: domain.reservationId,
      paymentStatus: domain.paymentStatus,
      paymentUrl: domain.paymentUrl,
    }
  }
}
