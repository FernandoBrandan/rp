// src / modules /04payments / application / listeners / order - created.listener.ts
import { Injectable, Inject } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { EventNames } from '@common/events/event-names';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_FINDER } from '@infra/tokens';

import { OrderFinderPort } from '../ports/order-finder.port';
import { CreatePaymentLinkUseCase } from '../use-cases/create-payment-link.use-case';

import {
  PaymentLinkCreatedEvent,
  OrderPaymentFailedEvent,
} from '@common/events/';

@Injectable()
export class OrderCreatedListener {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(ORDER_FINDER) private readonly orderFinder: OrderFinderPort,
    private readonly createPaymentLink: CreatePaymentLinkUseCase,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_CREATED)
  async handle(event: { orderId: string }) {
    this.logger.info('Payment - OrderCreated received', {
      orderId: event.orderId,
    });
    const order = await this.orderFinder.findById(event.orderId);
    if (!order) return;

    try {
      const paymentUrl = await this.createPaymentLink.execute(order);
      this.eventEmitter.emit(
        EventNames.PAYMENT_LINK_CREATED,
        new PaymentLinkCreatedEvent(order.id, paymentUrl),
      );
    } catch (error) {
      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(order.id, 'error'),
      );
    }
  }
}
