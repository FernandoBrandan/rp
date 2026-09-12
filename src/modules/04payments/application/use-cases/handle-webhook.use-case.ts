import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventNames,
  OrderPaidEvent,
  OrderPaymentFailedEvent,
} from '@common/events';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';

export interface PaymentWebhookPayload {
  id: string;
  status: string;
  metadata: { orderId: string };
}

const APPROVED = ['approved', 'succeeded', 'paid'];
const FAILED = ['failed', 'rejected', 'cancelled'];

@Injectable()
export class HandleWebhookUseCase {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async execute(payload: PaymentWebhookPayload): Promise<void> {
    if (!payload?.id || !payload?.metadata?.orderId) {
      throw new BadRequestException('Invalid webhook payload');
    }

    const orderId = payload.metadata.orderId;
    const status = payload.status?.toLowerCase();

    if (APPROVED.includes(status)) {
      this.logger.info('Webhook: payment approved', { orderId });
      this.eventEmitter.emit(
        EventNames.ORDER_PAID,
        new OrderPaidEvent(orderId),
      );
      return;
    }

    if (FAILED.includes(status)) {
      this.logger.info('Webhook: payment failed', { orderId, status });
      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(orderId, status),
      );
      return;
    }

    this.logger.debug('Webhook: ignoring non-terminal status', {
      orderId,
      status,
    });
  }
}
