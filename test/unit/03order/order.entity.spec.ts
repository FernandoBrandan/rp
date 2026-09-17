import { Money } from '@common/domain/value-objects/money.vo';
import { Order } from '@order/domain/order.entity';
import { OrderItem } from '@order/domain/value-objects/orderItem.vo';
import { OrderStatus } from '@order/domain/enums/orderStatus.enum';
import { PaymentStatus } from '@order/domain/enums/paymentStatus.enum';

function makeOrder() {
  return Order.create({
    id: 'ORDER-1',
    userId: 'user-1',
    idempotencyKey: 'key-1',
    items: [new OrderItem('prod-1', 2, new Money(100))],
    reservationId: 'res-1',
  });
}

describe('Order', () => {
  it('create calcula total y arranca PENDING', () => {
    const order = makeOrder();

    expect(order.total.getValue()).toBe(200);
    expect(order.status).toBe(OrderStatus.PENDING);
    expect(order.paymentStatus).toBe(PaymentStatus.PENDING);
  });

  it('create falla si no hay items', () => {
    expect(() =>
      Order.create({
        id: 'ORDER-1',
        userId: 'user-1',
        idempotencyKey: 'key-1',
        items: [],
        reservationId: 'res-1',
      }),
    ).toThrow('Order must have at least one item');
  });

  it('pay() pasa a PAID desde PENDING', () => {
    const order = makeOrder();

    order.pay();

    expect(order.status).toBe(OrderStatus.PAID);
    expect(order.paymentStatus).toBe(PaymentStatus.READY);
  });

  it('pay() falla si la orden ya está FAILED', () => {
    const order = makeOrder();

    order.fail();

    expect(() => order.pay()).toThrow(
      'Only pending or waiting payment orders can be paid',
    );
  });

  it('waiting_payment() pasa a WAITING_PAYMENT', () => {
    const order = makeOrder();

    order.waiting_payment();

    expect(order.status).toBe(OrderStatus.WAITING_PAYMENT);
  });

  it('fail() pasa a FAILED', () => {
    const order = makeOrder();

    order.fail();

    expect(order.status).toBe(OrderStatus.FAILED);
  });

  it('completeOrder() solo se puede desde PAID', () => {
    const order = makeOrder();

    expect(() => order.completeOrder()).toThrow(
      'Only paid orders can be completed',
    );

    order.pay();
    order.completeOrder();

    expect(order.status).toBe(OrderStatus.COMPLETED);
  });

  it('cancelOrder() no permite cancelar una orden COMPLETED', () => {
    const order = makeOrder();

    order.pay();
    order.completeOrder();

    expect(() => order.cancelOrder()).toThrow(
      'Cannot cancel a completed or already cancelled order',
    );
  });

  it('setPaymentUrl solo setea una vez', () => {
    const order = makeOrder();

    order.setPaymentUrl('http://pay/1');
    order.setPaymentUrl('http://pay/2');

    expect(order.paymentUrl).toBe('http://pay/1');
  });

  it('markPaymentGenerating cambia paymentStatus', () => {
    const order = makeOrder();

    order.markPaymentGenerating();

    expect(order.paymentStatus).toBe(PaymentStatus.GENERATING);
  });

  it('markPaymentReady no pisa un FAILED', () => {
    const order = makeOrder();

    order.markPaymentFailed();
    order.markPaymentReady();

    expect(order.paymentStatus).toBe(PaymentStatus.FAILED);
  });
});
