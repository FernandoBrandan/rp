// src/infra/event-bus/consumers/payment-link-created.consumer.ts

import { Inject, Injectable, OnModuleInit } from '@nestjs/common'

import { Logger } from '@infra/logger/logger.interface'
import { EVENT_CONSUMER, LOGGER, ORDER_REPOSITORY } from '@infra/tokens'
import { Topics } from '@common/events/event-names'

import { EventConsumerPort } from '@infra/event-bus/ports/event-consumer.port'
import { OrderRepository } from '@order/domain/repositories/order.repository'

interface PaymentLinkCreatedPayload {
  orderId: string
  paymentUrl: string
}

@Injectable()
export class PaymentLinkCreatedConsumer implements OnModuleInit {
  constructor(
    @Inject(EVENT_CONSUMER)
    private readonly consumer: EventConsumerPort,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.consumer.subscribe<PaymentLinkCreatedPayload>(
      Topics.PAYMENT_LINK_CREATED,
      { queue: 'order.consumer.payment-link' },
      (payload) => this.handle(payload),
    )
  }

  private async handle(payload: PaymentLinkCreatedPayload): Promise<void> {
    const order = await this.orderRepository.getOrderDetail(payload.orderId)
    if (!order) {
      this.logger.warn('PaymentLinkCreated received for unknown order', {
        event: 'payment_link_orphan',
        orderId: payload.orderId,
      })
      return
    }

    // Idempotencia: si ya tiene URL, no pisar
    if (order.paymentUrl) {
      this.logger.debug('Payment URL already set, skipping', { orderId: order.id })
      return
    }

    order.setPaymentUrl(payload.paymentUrl)
    order.waiting_payment()
    order.markPaymentReady()
    await this.orderRepository.update(order)

    this.logger.info('Payment link attached to order', {
      orderId: order.id,
      paymentUrl: payload.paymentUrl,
    })
  }
}
