jest.mock('@nestjs/schedule', () => ({
  Cron: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {},
  CronExpression: {
    EVERY_MINUTE: '* * * * *',
  },
}))

import { OrderReconciliationService } from '@order/application/services/order-reconciliation.service'
import { Order } from '@main/modules/03order/domain/order.entity'
import { OrderItem } from '@order/domain/value-objects/orderItem.vo'
import { Money } from '@common/domain/value-objects/money.vo'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'

function makeLogger() {
  return { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}

function makeConfig(overrides: Record<string, string> = {}) {
  const defaults: Record<string, string> = {
    RECONCILIATION_ENABLED: 'true',
    RECONCILIATION_WINDOW_MINUTES: '60',
    RECONCILIATION_BATCH_SIZE: '50',
  }
  const all = { ...defaults, ...overrides }
  return { get: jest.fn((k: string, d?: any) => all[k] ?? d) }
}

function makeOrder(status: OrderStatus, reservationId = 'res-1'): Order {
  const o = Order.create({
    id: 'ORDER-1',
    userId: 'user-1',
    idempotencyKey: 'k',
    items: [new OrderItem('p', 1, new Money(100))],
    reservationId,
  })
  if (status === OrderStatus.PAID) o.pay()
  else if (status === OrderStatus.FAILED) o.fail()
  else if (status === OrderStatus.CANCELLED) o.cancelOrder()
  else if (status === OrderStatus.WAITING_PAYMENT) o.waiting_payment()
  return o
}

describe('OrderReconciliationService', () => {
  describe('reconcilePaidOrders', () => {
    it('confirma la reserva si la orden está PAID pero la reserva sigue RESERVED', async () => {
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.PAID)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('RESERVED'),
        confirmReservation: jest.fn().mockResolvedValue(undefined),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.confirmReservation).toHaveBeenCalledWith('res-1')
    })

    it('no hace nada si la reserva ya está CONFIRMED', async () => {
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.PAID)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('CONFIRMED'),
        confirmReservation: jest.fn(),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.confirmReservation).not.toHaveBeenCalled()
    })

    it('loguea anomalía si la reserva está RELEASED pero la orden está PAID', async () => {
      const logger = makeLogger()
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.PAID)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('RELEASED'),
        confirmReservation: jest.fn(),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        logger as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.confirmReservation).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        'Reconciliation: PAID with RELEASED reservation',
        expect.objectContaining({ event: 'reconciliation_anomaly', orderId: 'ORDER-1' }),
      )
    })

    it('no crashea si confirmReservation falla, sigue con el siguiente', async () => {
      const o1 = { ...makeOrder(OrderStatus.PAID, 'res-1'), id: 'ORDER-1' }
      const o2 = { ...makeOrder(OrderStatus.PAID, 'res-2'), id: 'ORDER-2' }
      const orders = { findRecentByStatuses: jest.fn().mockResolvedValue([o1, o2]) }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('RESERVED'),
        confirmReservation: jest
          .fn()
          .mockRejectedValueOnce(new Error('db down'))
          .mockResolvedValueOnce(undefined),
      }
      const logger = makeLogger()
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        logger as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.confirmReservation).toHaveBeenCalledTimes(2)
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('skippea órdenes sin reservationId', async () => {
      const order = makeOrder(OrderStatus.PAID, '')
      const orders = { findRecentByStatuses: jest.fn().mockResolvedValue([order]) }
      const stock = { getReservationStatus: jest.fn(), confirmReservation: jest.fn() }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.getReservationStatus).not.toHaveBeenCalled()
    })

    it('no corre si RECONCILIATION_ENABLED=false', async () => {
      const orders = { findRecentByStatuses: jest.fn() }
      const stock = { getReservationStatus: jest.fn(), confirmReservation: jest.fn() }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig({ RECONCILIATION_ENABLED: 'false' }) as any,
      )

      await svc.reconcilePaidOrders()

      expect(orders.findRecentByStatuses).not.toHaveBeenCalled()
    })

    it('early return si no hay candidatos', async () => {
      const orders = { findRecentByStatuses: jest.fn().mockResolvedValue([]) }
      const stock = { getReservationStatus: jest.fn(), confirmReservation: jest.fn() }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcilePaidOrders()

      expect(stock.getReservationStatus).not.toHaveBeenCalled()
    })
  })

  describe('reconcileFailedOrders', () => {
    it('libera la reserva si la orden está FAILED pero la reserva sigue RESERVED', async () => {
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.FAILED)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('RESERVED'),
        releaseReservation: jest.fn().mockResolvedValue(undefined),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcileFailedOrders()

      expect(stock.releaseReservation).toHaveBeenCalledWith('res-1')
    })

    it('loguea anomalía si la orden está FAILED pero la reserva está CONFIRMED', async () => {
      const logger = makeLogger()
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.FAILED)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('CONFIRMED'),
        releaseReservation: jest.fn(),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        logger as any,
        makeConfig() as any,
      )

      await svc.reconcileFailedOrders()

      expect(stock.releaseReservation).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        'Reconciliation: FAILED with CONFIRMED reservation',
        expect.objectContaining({ event: 'reconciliation_anomaly' }),
      )
    })

    it('no hace nada si la reserva ya está RELEASED', async () => {
      const orders = {
        findRecentByStatuses: jest.fn().mockResolvedValue([makeOrder(OrderStatus.FAILED)]),
      }
      const stock = {
        getReservationStatus: jest.fn().mockResolvedValue('RELEASED'),
        releaseReservation: jest.fn(),
      }
      const svc = new OrderReconciliationService(
        orders as any,
        stock as any,
        makeLogger() as any,
        makeConfig() as any,
      )

      await svc.reconcileFailedOrders()

      expect(stock.releaseReservation).not.toHaveBeenCalled()
    })
  })
})
