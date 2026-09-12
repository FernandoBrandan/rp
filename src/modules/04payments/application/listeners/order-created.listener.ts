import { Inject, Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventNames,
  OrderCreatedEvent,
  PaymentLinkCreatedEvent,
  OrderPaymentFailedEvent,
} from '@common/events';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_FINDER, ORDER_PAYMENT_STATUS } from '@infra/tokens';
import { OrderFinderPort } from '../ports/order-finder.port';
import { OrderPaymentStatusPort } from '../ports/order-payment-status.port';
import { CreatePaymentLinkUseCase } from '../use-cases/create-payment-link.use-case';

@Injectable()
export class OrderCreatedListener {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(ORDER_FINDER) private readonly orderFinder: OrderFinderPort,
    @Inject(ORDER_PAYMENT_STATUS)
    private readonly paymentStatusPort: OrderPaymentStatusPort,
    private readonly createPaymentLink: CreatePaymentLinkUseCase,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_CREATED)
  async handle(event: OrderCreatedEvent) {
    this.logger.info('Payment - OrderCreated received', {
      orderId: event.orderId,
    });

    const order = await this.orderFinder.findById(event.orderId);
    if (!order) {
      this.logger.warn('Payment - Order not found, skipping', {
        orderId: event.orderId,
      });
      return;
    }

    if (order.paymentUrl) {
      this.logger.debug('Payment link already exists, skipping', {
        orderId: order.id,
      });
      return;
    }

    try {
      await this.paymentStatusPort.markGenerating(order.id);
      const paymentUrl = await this.createPaymentLink.execute(order);

      this.eventEmitter.emit(
        EventNames.PAYMENT_LINK_CREATED,
        new PaymentLinkCreatedEvent(order.id, paymentUrl),
      );

      this.logger.info('Payment link created', { orderId: order.id });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';

      this.logger.error('Failed to create payment link', {
        orderId: order.id,
        error: reason,
      });

      try {
        await this.paymentStatusPort.markFailed(order.id);
      } catch (markError) {
        this.logger.error('Failed to mark order payment as failed', {
          orderId: order.id,
          error:
            markError instanceof Error ? markError.message : String(markError),
        });
      }

      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(order.id, `payment_link_failed:${reason}`),
      );
    }
  }
}
