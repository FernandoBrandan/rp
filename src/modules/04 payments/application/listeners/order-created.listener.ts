// modules/04 payments/application/listeners/order-created.listener.ts
import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, PAYMENT_ORDER_PORT } from '@infra/tokens';

import { OrderCreatedEvent } from '@order/domain/events/order-created.event';

import { PaymentLinkCreatedEvent } from '../../domain/events/payment-link-created.event';
import { CreatePaymentLinkUseCase } from '../use-case/CreatePaymentLink.use-case';
import { OrderRepository } from '../ports/order.port';
import { OrderPaymentFailedEvent } from '@payment/domain/events/Order.paymentFailed.event';
import { toDomain } from '../use-case/order.mapper';

@Injectable()
export class OrderCreatedListener {
  constructor(
    private readonly eventEmitter: EventEmitter2,

    @Inject(PAYMENT_ORDER_PORT)
    private readonly orderRepository: OrderRepository,

    private readonly CreatePaymentLinkUseCase: CreatePaymentLinkUseCase,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreatedEvent(event: OrderCreatedEvent) {
    this.logger.info('Payment - OrderCreated received', {
      orderId: event.orderId,
    });

    const raw = await this.orderRepository.findById(event.orderId);
    if (!raw) {
      this.logger.warn('Order not found', { orderId: event.orderId });
      return;
    }

    const order = toDomain(raw);
    try {
      const paymentUrl = await this.retry(() =>
        this.CreatePaymentLinkUseCase.execute(order),
      );

      this.eventEmitter.emit(
        'payment.link.created',
        new PaymentLinkCreatedEvent(order.id, paymentUrl),
      );
    } catch (error) {
      this.eventEmitter.emit(
        'order.payment_link_failed',
        new OrderPaymentFailedEvent(
          order.id,
          error instanceof Error ? error.message : String(error),
        ),
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await this.delay(1000 * Math.pow(2, attempt - 1));
        }
      }
    }
    throw lastError;
  }
}
