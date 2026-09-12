// modules/04 payments/infra/providers/fake-payment.provider.ts

import { Inject, Injectable } from '@nestjs/common';
import { PaymentProviderPort } from '@payment/application/ports/payment-provider.port';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EventNames, OrderPaidEvent } from '@common/events/';
import { LOGGER } from '@infra/tokens';
import { Logger } from '@infra/logger/logger.interface';

@Injectable()
export class FakePaymentProvider implements PaymentProviderPort {
  constructor(
    private readonly eventEmitter: EventEmitter2,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async generatePaymentLink(data: {
    orderId: string;
    total: number;
    items: any[];
  }): Promise<{ url: string }> {
    this.logger.info('FakePaymentProvider - generatePaymentLink');

    const url = `http://fake-payment/${data.orderId}`;

    setTimeout(() => {
      this.eventEmitter.emit('payment.approved', {
        orderId: data.orderId,
      });
    }, 3000);

    return { url };
  }
}

@Injectable()
export class PaymentApprovedListener {
  constructor(private readonly eventEmitter: EventEmitter2) {}
  @OnEvent('payment.approved')
  handle(payload: { orderId: string }) {
    this.eventEmitter.emit(
      EventNames.ORDER_PAID,
      new OrderPaidEvent(payload.orderId),
    );
  }
}
