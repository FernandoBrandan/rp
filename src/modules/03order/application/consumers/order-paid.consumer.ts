// src/infra/event-bus/consumers/order-paid.consumer.ts

import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import { Logger } from '@infra/logger/logger.interface'
import { EVENT_CONSUMER, LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'
import { Topics } from '@common/events/event-names'

import { EventConsumerPort } from '@infra/event-bus/ports/event-consumer.port'
import { OrderRepository } from '@order/domain/repositories/order.repository'
import { StockPort } from '@order/application/ports/stock.port'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'

interface OrderPaidPayload {
  orderId: string
}

const TERMINAL_STATUSES = new Set<OrderStatus>([
  OrderStatus.FAILED,
  OrderStatus.CANCELLED,
  OrderStatus.COMPLETED,
])

@Injectable()
export class OrderPaidConsumer implements OnModuleInit {
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

  async onModuleInit() {
    await this.consumer.subscribe<OrderPaidPayload>(
      Topics.PAYMENT_APPROVED,
      {
        queue: 'order.consumer.paid',
        routingKey: Topics.PAYMENT_APPROVED,
        prefetch: 10,
        maxRetries: 3,
      },
      (payload) => this.handle(payload),
    )
  }

  private async handle(payload: OrderPaidPayload) {
    const order = await this.orderRepository.getOrderDetail(payload.orderId)
    if (!order) {
      this.logger.warn('OrderPaid received for unknown order', {
        event: 'order_paid_orphan',
        orderId: payload.orderId,
      })
      return
    }

    if (order.status === OrderStatus.PAID) return
    // Ya terminó en un estado incompatible → este ORDER_PAID llegó tarde
    // (típico: timeout en el link, orden marcada FAILED, webhook tardío del provider)
    if (TERMINAL_STATUSES.has(order.status)) {
      this.logger.warn('OrderPaid ignored — terminal state', {
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

    this.logger.info('Order marked PAID', { orderId: order.id })
  }
}
