import { Injectable, Inject } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { EventNames } from '@common/events/event-names'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'

import { OrderRepository } from '@order/domain/repositories/order.repository'
import { StockPort } from '../ports/stock.port'
import { OrderPaidEvent } from '@common/events/'
import { OrderStatus } from '../../domain/enums/orderStatus.enum'

const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.FAILED,
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
])

@Injectable()
export class OrderPaidListener {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockPort,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_PAID)
  async handle(event: OrderPaidEvent) {
    const order = await this.orderRepository.getOrderDetail(event.orderId)
    if (!order) {
      this.logger.warn('OrderPaid received for unknown order', {
        event: 'order_paid_orphan',
        orderId: event.orderId,
      })
      return
    }

    // Ya está PAID → nada que hacer (idempotencia)
    if (order.status === OrderStatus.PAID) {
      this.logger.debug('Order already PAID, skipping', { orderId: order.id })
      return
    }

    // Ya terminó en un estado incompatible → este ORDER_PAID llegó tarde
    // (típico: timeout en el link, orden marcada FAILED, webhook tardío del provider)
    if (TERMINAL_STATUSES.has(order.status)) {
      this.logger.warn('OrderPaid ignored — order already in terminal state', {
        event: 'order_paid_late',
        orderId: order.id,
        currentStatus: order.status,
      })
      return
    }

    if (order.reservationId) {
      try {
        await this.stockService.confirmReservation(order.reservationId)
        this.logger.info('Stock confirmed', { orderId: order.id })
      } catch (err) {
        this.logger.error('Failed to confirm stock — aborting payment', {
          event: 'stock_confirm_failed',
          orderId: order.id,
          reservationId: order.reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
        return // no marcamos PAID si el stock no se confirmó
      }
    }

    order.pay()
    await this.orderRepository.update(order)
  }
}
