import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY } from '@infra/tokens';

import { PaymentLinkCreatedEvent } from '../../domain/events/payment-link-created.event';
import { OrderRepository } from '../../domain/repositories/order.repository';

@Injectable()
export class PaymentLinkCreatedSubscriber {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent('payment.link.created')
  async handle(event: PaymentLinkCreatedEvent) {
    this.logger.info('Processing payment link attachment', {
      orderId: event.orderId,
    });

    try {
      const order = await this.orderRepository.getOrderDetail(event.orderId);

      if (!order) {
        this.logger.error('Order not found while attaching payment URL', {
          orderId: event.orderId,
        });
        return;
      }

      order.setPaymentUrl(event.paymentUrl);
      order.waiting_payment();

      await this.orderRepository.update(order);
      this.logger.info(
        'FLOW 2 Estado Pendiente: Payment URL successfully attached to order',
        {
          orderId: order.id,
          url: event.paymentUrl,
        },
      );
    } catch (error) {
      this.logger.error('Failed to attach payment URL', {
        orderId: event.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Aquí podrías lanzar un evento de compensación si fuera necesario
    }
  }
}
