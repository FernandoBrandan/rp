import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EventNames,
  OrderPaidEvent,
  OrderPaymentFailedEvent,
} from '@common/events';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port';

type FakeOutcome = 'approved' | 'failed' | 'pending';

@Injectable()
export class FakePaymentProvider implements PaymentProviderPort {
  private readonly outcome: FakeOutcome;
  private readonly delayMs: number;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.outcome = this.config.get<FakeOutcome>(
      'FAKE_PAYMENT_OUTCOME',
      'approved',
    );
    this.delayMs = Number(
      this.config.get<string>('FAKE_PAYMENT_DELAY_MS', '3000'),
    );
  }

  async generatePaymentLink(
    order: PaymentOrderSnapshot,
  ): Promise<{ url: string }> {
    const url = `http://fake-payment.local/pay/${order.id}`;

    this.logger.info('FakePaymentProvider: link generated', {
      orderId: order.id,
      url,
      outcome: this.outcome,
      delayMs: this.delayMs,
    });

    this.scheduleOutcome(order.id);

    return { url };
  }

  private scheduleOutcome(orderId: string) {
    if (this.outcome === 'pending') return;

    setTimeout(() => {
      if (this.outcome === 'approved') {
        this.logger.info('FakePaymentProvider: simulating approval', {
          orderId,
        });
        this.eventEmitter.emit(
          EventNames.ORDER_PAID,
          new OrderPaidEvent(orderId),
        );
        return;
      }

      this.logger.info('FakePaymentProvider: simulating failure', {
        orderId,
      });
      this.eventEmitter.emit(
        EventNames.ORDER_PAYMENT_FAILED,
        new OrderPaymentFailedEvent(orderId, 'fake_provider_failed'),
      );
    }, this.delayMs).unref();
  }
}
