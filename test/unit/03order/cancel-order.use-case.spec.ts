import { ConflictException, NotFoundException } from '@nestjs/common'
import { CancelOrderUseCase } from '@order/application/use-cases/cancel-order.use-case'
import { Order } from '@main/modules/03order/domain/order.entity'
import { OrderItem } from '@order/domain/value-objects/orderItem.vo'
import { Money } from '@main/common/domain/value-objects/money.vo'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

function makeOrder(status: OrderStatus, userId = 'user-1'): Order {
  const o = Order.create({
    id: 'ORDER-1',
    userId,
    idempotencyKey: 'k',
    items: [new OrderItem('p', 1, new Money(100))],
    reservationId: 'res-1',
  })
  if (status === OrderStatus.PAID) o.pay()
  if (status === OrderStatus.WAITING_PAYMENT) o.waiting_payment()
  if (status === OrderStatus.FAILED) o.fail()
  if (status === OrderStatus.CANCELLED) o.cancelOrder()
  return o
}

function makeDeps(overrides: any = {}) {
  return {
    orderRepo: {
      getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PENDING)),
      update: jest.fn().mockResolvedValue(undefined),
      ...overrides.orderRepo,
    },
    stock: {
      restockReservation: jest.fn().mockResolvedValue(undefined),
      ...overrides.stock,
    },
    refund: {
      refund: jest.fn().mockResolvedValue({ refundId: 'r-1' }),
      ...overrides.refund,
    },
    logger: makeLogger(),
  }
}

function build(deps: any) {
  return new CancelOrderUseCase(deps.orderRepo, deps.stock, deps.refund, deps.logger)
}

describe('CancelOrderUseCase', () => {
  it('cancela una orden PENDING y hace restock, sin refund', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PENDING)),
        update: jest.fn().mockResolvedValue(undefined),
      },
    })
    const uc = build(deps)

    const result = await uc.execute('user-1', 'ORDER-1')

    expect(result.status).toBe(OrderStatus.CANCELLED)
    expect(deps.orderRepo.update).toHaveBeenCalledTimes(1)
    expect(deps.stock.restockReservation).toHaveBeenCalledWith('res-1')
    expect(deps.refund.refund).not.toHaveBeenCalled()
  })

  it('cancela una orden PAID, hace restock Y refund', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PAID)),
        update: jest.fn().mockResolvedValue(undefined),
      },
    })
    const uc = build(deps)

    await uc.execute('user-1', 'ORDER-1')

    expect(deps.stock.restockReservation).toHaveBeenCalledWith('res-1')
    expect(deps.refund.refund).toHaveBeenCalledWith({
      orderId: 'ORDER-1',
      amount: 100,
      reason: 'user_cancelled_paid_order',
    })
  })

  it('es idempotente: si ya está CANCELLED, no recompenza', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.CANCELLED)),
        update: jest.fn(),
      },
    })
    const uc = build(deps)

    const result = await uc.execute('user-1', 'ORDER-1')

    expect(result.status).toBe(OrderStatus.CANCELLED)
    expect(deps.orderRepo.update).not.toHaveBeenCalled()
    expect(deps.stock.restockReservation).not.toHaveBeenCalled()
    expect(deps.refund.refund).not.toHaveBeenCalled()
  })

  it('lanza NotFound si la orden no existe', async () => {
    const deps = makeDeps({
      orderRepo: { getOrderDetail: jest.fn().mockResolvedValue(null) },
    })
    const uc = build(deps)

    await expect(uc.execute('user-1', 'X')).rejects.toThrow(NotFoundException)
  })

  it('lanza NotFound si la orden es de otro usuario (no filtra existencia)', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PENDING, 'user-2')),
      },
    })
    const uc = build(deps)

    await expect(uc.execute('user-1', 'ORDER-1')).rejects.toThrow(NotFoundException)
  })

  it('lanza Conflict si está FAILED', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.FAILED)),
      },
    })
    const uc = build(deps)

    await expect(uc.execute('user-1', 'ORDER-1')).rejects.toThrow(ConflictException)
  })

  it('NO aborta si restock falla — la orden igual queda CANCELLED', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PAID)),
        update: jest.fn().mockResolvedValue(undefined),
      },
      stock: { restockReservation: jest.fn().mockRejectedValue(new Error('db down')) },
    })
    const uc = build(deps)

    const result = await uc.execute('user-1', 'ORDER-1')

    expect(result.status).toBe(OrderStatus.CANCELLED)
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('restock failed'),
      expect.objectContaining({ event: 'cancel_restock_failed' }),
    )
  })

  it('NO aborta si refund falla', async () => {
    const deps = makeDeps({
      orderRepo: {
        getOrderDetail: jest.fn().mockResolvedValue(makeOrder(OrderStatus.PAID)),
        update: jest.fn().mockResolvedValue(undefined),
      },
      refund: { refund: jest.fn().mockRejectedValue(new Error('provider down')) },
    })
    const uc = build(deps)

    const result = await uc.execute('user-1', 'ORDER-1')

    expect(result.status).toBe(OrderStatus.CANCELLED)
    expect(deps.logger.error).toHaveBeenCalledWith(
      expect.stringContaining('refund failed'),
      expect.objectContaining({ event: 'cancel_refund_failed' }),
    )
  })
})
