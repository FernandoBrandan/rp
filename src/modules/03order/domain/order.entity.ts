// src/modules/03order/domain/order.entity.ts
import { OrderItem } from './value-objects/orderItem.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { OrderStatus } from './enums/orderStatus.enum';
import { PaymentStatus } from './enums/paymentStatus.enum';

interface IOrder {
  id: string;
  userId: string;
  idempotencyKey: string;
  items: OrderItem[];
  total: Money;
  status: OrderStatus;
  reservationId: string;
  paymentStatus: PaymentStatus;
  paymentUrl?: string;
}

interface CreateOrderProps {
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
    public paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    public paymentUrl?: string,
  ) {}

  static create(props: CreateOrderProps): Order {
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
      PaymentStatus.PENDING,
      // paymentUrl  undefined por default
    );
  }

  pay() {
    if (
      this.status !== OrderStatus.PENDING &&
      this.status !== OrderStatus.WAITING_PAYMENT
    ) {
      throw new Error('Only pending or waiting payment orders can be paid');
    }
    this.status = OrderStatus.PAID;
    this.paymentStatus = PaymentStatus.READY;
  }

  waiting_payment() {
    if (this.status !== OrderStatus.PENDING)
      throw new Error('Only pending orders can move to waiting payment');
    this.status = OrderStatus.WAITING_PAYMENT;
  }

  fail() {
    if (
      this.status !== OrderStatus.PENDING &&
      this.status !== OrderStatus.WAITING_PAYMENT
    )
      throw new Error('Only pending or waiting payment orders can fail');
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

  markPaymentGenerating() {
    if (this.paymentStatus !== PaymentStatus.PENDING) return;
    this.paymentStatus = PaymentStatus.GENERATING;
  }

  markPaymentReady() {
    if (this.paymentStatus === PaymentStatus.READY) return;
    if (this.paymentStatus === PaymentStatus.FAILED) return;
    this.paymentStatus = PaymentStatus.READY;
  }

  markPaymentFailed() {
    if (this.paymentStatus === PaymentStatus.FAILED) return;
    if (this.paymentStatus === PaymentStatus.READY) {
      throw new Error('Cannot fail payment link after it is ready');
    }
    this.paymentStatus = PaymentStatus.FAILED;
  }
}
