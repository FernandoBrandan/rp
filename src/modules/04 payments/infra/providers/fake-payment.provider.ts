// modules/04 payments/infra/providers/fake-payment.provider.ts

import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '../../application/ports/payment-provider.port';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { OrderPaidEvent } from '@payment/domain/events/order.paid.event';

@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async generatePaymentLink(data: {
    orderId: string;
    total: number;
    items: any[];
  }): Promise<{ url: string }> {
    const url = `http://fake-payment/${data.orderId}`;

    // simula comportamiento async real
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
    this.eventEmitter.emit('order.paid', new OrderPaidEvent(payload.orderId));
  }
}
