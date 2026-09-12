import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventNames } from '@common/events/event-names';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';
import { OrderPaidEvent, OrderPaymentFailedEvent } from '@common/events/';

@Injectable()
export class HandleWebhookUseCase {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async execute(payload: any, headers: Record<string, string>): Promise<void> {
    if (!payload?.id || !payload?.metadata?.orderId) {
      throw new BadRequestException('Invalid webhook payload');
    }
    const orderId = payload.metadata.orderId;
    const status = payload.status?.toLowerCase();

    if (status === 'approved' || status === 'succeeded' || status === 'paid') {
      this.eventEmitter.emit(
        EventNames.ORDER_PAID,
        new OrderPaidEvent(orderId),
      );
    } else if (
      status === 'failed' ||
      status === 'rejected' ||
      status === 'cancelled'
    ) {
      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(orderId),
      );
    } else {
      this.logger.debug('Ignoring non-terminal webhook status', {
        status,
        orderId,
      });
    }
  }
}
