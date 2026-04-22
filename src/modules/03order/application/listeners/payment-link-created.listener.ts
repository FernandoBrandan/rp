import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '@common/events/event-names';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY } from '@infra/tokens';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { PaymentLinkCreatedEvent } from '../../domain/events/payment-link-created.event';

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
    order.setPaymentUrl(event.paymentUrl);
    order.waiting_payment();
    await this.orderRepository.update(order);
  }
}
