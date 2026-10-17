// src/infra/event-bus/consumers/order-payment-failed.consumer.ts

import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import { Logger } from '@infra/logger/logger.interface'
import { EVENT_CONSUMER, LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'
import { Topics } from '@common/events/event-names'

import { EventConsumerPort } from '@infra/event-bus/ports/event-consumer.port'
import { OrderRepository } from '@order/domain/repositories/order.repository'
import { StockPort } from '@order/application/ports/stock.port'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'

interface OrderPaymentFailedPayload {
  orderId: string
  reason?: string
}

const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.PAID,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
])

@Injectable()
export class OrderPaymentFailedConsumer implements OnModuleInit {
  constructor(
    @Inject(EVENT_CONSUMER)
    private readonly consumer: EventConsumerPort,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockPort,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.subscribe<OrderPaymentFailedPayload>(
      Topics.PAYMENT_REJECTED,
      { queue: 'order.consumer.payment-failed' },
      (payload) => this.handle(payload),
    )
  }

  private async handle(payload: OrderPaymentFailedPayload): Promise<void> {
    const order = await this.orderRepository.getOrderDetail(payload.orderId)
    if (!order) return

    if (order.status === OrderStatus.FAILED) return
    if (TERMINAL_STATUSES.has(order.status)) {
      this.logger.warn('OrderPaymentFailed ignored — order in terminal state', {
        event: 'order_payment_failed_late',
        orderId: order.id,
        currentStatus: order.status,
        reason: payload.reason,
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
      reason: payload.reason,
    })
  }
}
