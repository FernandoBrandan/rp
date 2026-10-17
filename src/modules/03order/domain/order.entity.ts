import { OrderItem } from './value-objects/orderItem.vo'
import { Money } from '@main/common/domain/value-objects/money.vo'
import { OrderStatus } from './enums/orderStatus.enum'
import { PaymentStatus } from './enums/paymentStatus.enum'
import { Currency } from '@main/common/domain/value-objects/currency.vo'

interface IOrder {
  id: string
  userId: string
  idempotencyKey: string
  items: OrderItem[]
  total: Money
  status: OrderStatus
  reservationId: string
  paymentStatus: PaymentStatus
  paymentUrl?: string
}

interface CreateOrderProps {
  id: string
  userId: string
  idempotencyKey: string
  items: OrderItem[]
  currency: Currency
  reservationId: string
}

export class Order implements IOrder {
  private static readonly TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.WAITING_PAYMENT,
      OrderStatus.PAID,
      OrderStatus.FAILED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.WAITING_PAYMENT]: [OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.FAILED]: [],
    [OrderStatus.CANCELLED]: [],
  }

  private _status: OrderStatus

  get status(): OrderStatus {
    return this._status
  }

  get currency(): Currency {
    return this.total.currency
  }

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly idempotencyKey: string,
    public readonly items: OrderItem[],
    public readonly total: Money,
    status: OrderStatus = OrderStatus.PENDING,
    public readonly reservationId: string,
    public paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    public paymentUrl?: string,
  ) {
    this._status = status

    for (const item of this.items) {
      if (!item.price.currency.equals(this.total.currency)) {
        throw new Error('Order items currency mismatch')
      }
    }
  }

  static create(props: CreateOrderProps): Order {
    if (!props.items || props.items.length === 0)
      throw new Error('Order must have at least one item')

    const currency = props.currency
    const total = props.items.reduce((acc, item) => acc.add(item.subtotal()), Money.zero(currency))

    return new Order(
      props.id,
      props.userId,
      props.idempotencyKey,
      props.items,
      total,
      OrderStatus.PENDING,
      props.reservationId,
      PaymentStatus.PENDING,
    )
  }

  private transitionTo(nextStatus: OrderStatus) {
    const allowed = Order.TRANSITIONS[this._status]
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot transition from ${this._status} to ${nextStatus}`)
    }
    this._status = nextStatus
  }

  pay() {
    if (this._status === OrderStatus.PAID) return
    this.transitionTo(OrderStatus.PAID)
    this.paymentStatus = PaymentStatus.READY
  }

  waiting_payment() {
    this.transitionTo(OrderStatus.WAITING_PAYMENT)
  }

  fail() {
    if (this._status === OrderStatus.FAILED) return
    this.transitionTo(OrderStatus.FAILED)
  }

  completeOrder() {
    this.transitionTo(OrderStatus.COMPLETED)
  }

  cancelOrder() {
    if (this._status === OrderStatus.CANCELLED) return
    this.transitionTo(OrderStatus.CANCELLED)
  }

  canBeCancelled(): boolean {
    return Order.TRANSITIONS[this._status].includes(OrderStatus.CANCELLED)
  }

  setPaymentUrl(url: string) {
    if (this.paymentUrl) return
    this.paymentUrl = url
  }

  markPaymentGenerating() {
    if (this.paymentStatus !== PaymentStatus.PENDING) return
    this.paymentStatus = PaymentStatus.GENERATING
  }

  markPaymentReady() {
    if (this.paymentStatus === PaymentStatus.READY) return
    if (this.paymentStatus === PaymentStatus.FAILED) return
    this.paymentStatus = PaymentStatus.READY
  }

  markPaymentFailed() {
    if (this.paymentStatus === PaymentStatus.FAILED) return
    if (this.paymentStatus === PaymentStatus.READY) {
      throw new Error('Cannot fail payment link after it is ready')
    }
    this.paymentStatus = PaymentStatus.FAILED
  }
}
