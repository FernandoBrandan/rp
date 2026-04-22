// src/modules/03order/domain/order.entity.ts
import { OrderItem } from './value-objects/orderItem.vo';
import { Money } from './value-objects/money.vo';
import { OrderStatus } from './value-objects/orderStatus.vo';

interface IOrder {
  id: string;
  userId: string;
  idempotencyKey: string;
  items: OrderItem[];
  reservationId: string;
}

export class Order implements IOrder {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly idempotencyKey: string,
    public readonly items: OrderItem[],
    public readonly total: Money,
    public status: OrderStatus = OrderStatus.PENDING,
    public reservationId: string,
    public paymentUrl?: string,
  ) {}

  static create(props: IOrder): Order {
    if (!props.items || props.items.length === 0)
      throw new Error('Order must have at least one item');

    const total = props.items.reduce(
      (acc, item) => acc.add(item.subtotal()),
      new Money(0),
    );

    return new Order(
      props.id,
      props.userId,
      props.idempotencyKey,
      props.items,
      total,
      OrderStatus.PENDING,
      props.reservationId,
    );
  }

  pay() {
    this.status = OrderStatus.PAID;
  }

  waiting_payment() {
    if (this.status !== OrderStatus.PENDING)
      throw new Error('Only pending orders can fail');
    this.status = OrderStatus.WAITING_PAYMENT;
  }

  fail() {
    if (this.status !== OrderStatus.PENDING)
      throw new Error('Only pending orders can fail');
    this.status = OrderStatus.FAILED;
  }

  completeOrder() {
    if (this.status !== OrderStatus.PAID)
      throw new Error('Only paid orders can be completed');
    this.status = OrderStatus.COMPLETED;
  }

  cancelOrder() {
    if (
      this.status === OrderStatus.COMPLETED ||
      this.status === OrderStatus.CANCELLED
    )
      throw new Error('Cannot cancel a completed or already cancelled order');
    this.status = OrderStatus.CANCELLED;
  }

  setPaymentUrl(url: string) {
    if (this.status !== OrderStatus.PENDING) return;
    if (this.paymentUrl) return;
    this.paymentUrl = url;
  }
}
