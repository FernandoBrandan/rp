//src/modules/03order/application/listeners/order-payment-failed.listener.ts
import { Injectable, Inject } from '@nestjs/common'
// import { OnEvent } from '@nestjs/event-emitter'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'

import { Topics } from '@common/events/event-names'
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

  // @OnEvent(Topics.PAYMENT_REJECTED)
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

    // Liberar stock. Si falla, NO re-lanzamos: queremos marcar FAILED igual.
    // La reconciliación (cron) va a detectar la reserva huérfana y arreglarla.
    if (order.reservationId) {
      try {
        await this.stockService.releaseReservation(order.reservationId)
      } catch (err) {
        this.logger.error('Failed to release stock — reconciliation will retry', {
          event: 'stock_release_failed',
          orderId: order.id,
          reservationId: order.reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    order.fail()
    await this.orderRepository.update(order)
    this.logger.info('Order marked as FAILED', {
      orderId: order.id,
      reason: event.reason,
    })
  }
}
