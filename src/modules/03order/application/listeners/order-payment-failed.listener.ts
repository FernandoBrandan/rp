//src/modules/03order/application/listeners/order-payment-failed.listener.ts
import { Injectable, Inject } from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'

import { EventNames } from '@common/events/event-names'
import { OrderPaymentFailedEvent } from '@common/events/'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'
import { OrderRepository } from '@order/domain/repositories/order.repository'
import { StockPort } from '../ports/stock.port'

const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
])

@Injectable()
export class OrderPaymentFailedListener {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockPort,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_PAYMENT_FAILED)
  async handle(event: OrderPaymentFailedEvent) {
    const order = await this.orderRepository.getOrderDetail(event.orderId)
    if (!order) return

    if (order.status === OrderStatus.FAILED) return

    if (TERMINAL_STATUSES.has(order.status)) {
      this.logger.warn('OrderPaymentFailed ignored — order in terminal state', {
        event: 'order_payment_failed_late',
        orderId: order.id,
        currentStatus: order.status,
        reason: event.reason,
      })
      return
    }

    if (order.reservationId) {
      try {
        await this.stockService.releaseReservation(order.reservationId)
      } catch (err) {
        this.logger.error('Failed to release stock', {
          event: 'stock_release_failed',
          orderId: order.id,
          reservationId: order.reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
        // Seguimos igual: queremos marcar FAILED.
        // Si no pudimos liberar, la reconciliación (Fase 2, paso 6) lo arregla.
      }
    }

    order.fail()
    await this.orderRepository.update(order)
    this.logger.info('Order marked as failed', { orderId: event.orderId })
  }
}
