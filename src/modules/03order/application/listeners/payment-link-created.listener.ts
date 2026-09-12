// src/modules/03order/application/listeners/payment-link-created.listener.ts
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY } from '@infra/tokens';

import { EventNames } from '@common/events/event-names';
import { PaymentLinkCreatedEvent } from '@common/events/';

import { OrderRepository } from '@order/domain/repositories/order.repository';

@Injectable()
export class PaymentLinkCreatedListener {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.PAYMENT_LINK_CREATED)
  async handle(event: PaymentLinkCreatedEvent) {
    this.logger.info('Attaching payment URL to order', {
      orderId: event.orderId,
    });

    const order = await this.orderRepository.getOrderDetail(event.orderId);
    if (!order) return;
    if (order.paymentUrl) return;

    order.setPaymentUrl(event.paymentUrl);
    order.waiting_payment();
    order.markPaymentReady();
    await this.orderRepository.update(order);
  }
}
