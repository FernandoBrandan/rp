import { PaymentLinkCreatedListener } from '@order/application/listeners/payment-link-created.listener'
import { OrderPaidListener } from '@order/application/listeners/order-paid.listener'
import { OrderPaymentFailedListener } from '@order/application/listeners/order-payment-failed.listener'
import { Order } from '@order/domain/order.entity'
import { OrderItem } from '@order/domain/value-objects/orderItem.vo'
import { Money } from '@common/domain/value-objects/money.vo'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

function makeOrder(status: OrderStatus = OrderStatus.PENDING): Order {
  const o = Order.create({
    id: 'ORDER-1',
    userId: 'user-1',
    idempotencyKey: 'k',
    items: [new OrderItem('p', 1, new Money(100))],
    reservationId: 'res-1',
  })
  if (status !== OrderStatus.PENDING) (o as any).status = status
  return o
}

// ─── PaymentLinkCreatedListener ─────────────────────────────────
describe('PaymentLinkCreatedListener', () => {
  it('setea paymentUrl y pasa a WAITING_PAYMENT', async () => {
    const order = makeOrder()
    const repo = {
      getOrderDetail: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue(undefined),
    }
    const listener = new PaymentLinkCreatedListener(repo as any, makeLogger())

    await listener.handle({ orderId: 'ORDER-1', paymentUrl: 'http://pay/1' })

    expect(order.paymentUrl).toBe('http://pay/1')
    expect(order.status).toBe(OrderStatus.WAITING_PAYMENT)
    expect(repo.update).toHaveBeenCalledTimes(1)
  })

  it('no hace nada si la orden no existe', async () => {
    const repo = {
      getOrderDetail: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    }
    const listener = new PaymentLinkCreatedListener(repo as any, makeLogger())

    await listener.handle({ orderId: 'NO-EXISTE', paymentUrl: 'http://pay/1' })

    expect(repo.update).not.toHaveBeenCalled()
  })

  it('no hace nada si la orden ya tiene paymentUrl', async () => {
    const order = makeOrder()
    order.paymentUrl = 'http://old'
    const repo = {
      getOrderDetail: jest.fn().mockResolvedValue(order),
      update: jest.fn(),
    }
    const listener = new PaymentLinkCreatedListener(repo as any, makeLogger())

    await listener.handle({ orderId: 'ORDER-1', paymentUrl: 'http://new' })

    expect(order.paymentUrl).toBe('http://old')
    expect(repo.update).not.toHaveBeenCalled()
  })
})

// ─── OrderPaidListener ──────────────────────────────────────────
describe('OrderPaidListener', () => {
  it('marca como PAID y confirma la reserva', async () => {
    const order = makeOrder()
    const repo = {
      getOrderDetail: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue(undefined),
    }
    const stock = {
      confirmReservation: jest.fn().mockResolvedValue(undefined),
    }
    const listener = new OrderPaidListener(repo as any, stock as any, makeLogger())

    await listener.handle({ orderId: 'ORDER-1' })

    expect(order.status).toBe(OrderStatus.PAID)
    expect(stock.confirmReservation).toHaveBeenCalledWith('res-1')
    expect(repo.update).toHaveBeenCalledTimes(1)
  })
})

// ─── OrderPaymentFailedListener ─────────────────────────────────
describe('OrderPaymentFailedListener', () => {
  it('libera stock y pasa a FAILED', async () => {
    const order = makeOrder()
    const repo = {
      getOrderDetail: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue(undefined),
    }
    const stock = {
      releaseReservation: jest.fn().mockResolvedValue(undefined),
    }
    const listener = new OrderPaymentFailedListener(repo as any, stock as any, makeLogger())

    await listener.handle({ orderId: 'ORDER-1', reason: 'test' })

    expect(order.status).toBe(OrderStatus.FAILED)
    expect(stock.releaseReservation).toHaveBeenCalledWith('res-1')
  })

  // test/unit/03order/listeners.spec.ts — agregar

  describe('OrderPaidListener — defensivo', () => {
    it('ignora ORDER_PAID si la orden ya está FAILED', async () => {
      const order = makeOrder()
      order.fail()

      const repo = {
        getOrderDetail: jest.fn().mockResolvedValue(order),
        update: jest.fn(),
      }
      const stock = { confirmReservation: jest.fn() }
      const logger = makeLogger()

      const listener = new OrderPaidListener(repo as any, stock as any, logger as any)
      await listener.handle({ orderId: 'ORDER-1' })

      expect(stock.confirmReservation).not.toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('terminal state'),
        expect.objectContaining({ event: 'order_paid_late' }),
      )
    })

    it('no marca PAID si confirmReservation falla', async () => {
      const order = makeOrder()
      const repo = {
        getOrderDetail: jest.fn().mockResolvedValue(order),
        update: jest.fn(),
      }
      const stock = {
        confirmReservation: jest.fn().mockRejectedValue(new Error('boom')),
      }

      const listener = new OrderPaidListener(repo as any, stock as any, makeLogger() as any)
      await listener.handle({ orderId: 'ORDER-1' })

      expect(order.status).not.toBe(OrderStatus.PAID)
      expect(repo.update).not.toHaveBeenCalled()
    })

    it('es idempotente si la orden ya está PAID', async () => {
      const order = makeOrder()
      order.pay()

      const repo = {
        getOrderDetail: jest.fn().mockResolvedValue(order),
        update: jest.fn(),
      }
      const stock = { confirmReservation: jest.fn() }

      const listener = new OrderPaidListener(repo as any, stock as any, makeLogger() as any)
      await listener.handle({ orderId: 'ORDER-1' })

      expect(stock.confirmReservation).not.toHaveBeenCalled()
      expect(repo.update).not.toHaveBeenCalled()
    })
  })
})
