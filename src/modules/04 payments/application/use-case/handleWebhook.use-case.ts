// modules/04 payments/application/services/handleWebhook.use-case.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY } from '@infra/tokens';

import { OrderRepository } from '../ports/order.port';
import { OrderPaidEvent } from '@order/domain/events/order-paid.event';
import { OrderPaymentFailedEvent } from '@payment/domain/events/Order.paymentFailed.event';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async handleWebhook(
    payload: any,
    headers: Record<string, string>,
  ): Promise<void> {
    // Nose que quiso decir.. validar!
    // 5. Webhook mapea cualquier status no approved a FAILED
    // Ejemplo: Mercado Pago envía status: "pending" o "in_process".
    // Tu mapper lo convierte en FAILED y emites order.payment_failed de forma prematura.
    // Consecuencia: Pagos pendientes se tratan como fallido

    this.logger.info('Payment webhook received', {
      paymentId: payload?.id,
      status: payload?.status,
      orderId: payload?.metadata?.orderId,
    });

    if (!payload?.id || !payload?.metadata?.orderId) {
      this.logger.warn('Invalid webhook payload', { payload });
      throw new BadRequestException('Invalid webhook payload');
    }
    const orderId = payload.metadata.orderId;
    const paymentStatus = payload.status?.toLowerCase();

    // 3. mapear payload → interno
    const eventData = this.mapPayload(payload);
    if (!eventData) {
      this.logger.warn('Could not map webhook payload', { payload });
      return;
    }

    if (eventData.status === 'APPROVED') {
      this.eventEmitter.emit(
        'order.paid',
        new OrderPaidEvent(eventData.orderId),
      );
      this.logger.info('Order.paid event emitted', { orderId });
    } else if (eventData.status === 'FAILED') {
      this.eventEmitter.emit(
        'order.payment_failed',
        new OrderPaymentFailedEvent(orderId),
      );
      this.logger.warn('Order.payment_failed event emitted', {
        orderId,
        status: paymentStatus,
      });
    }

    const order = await this.orderRepository.findById(eventData.orderId);
    if (!order) {
      this.logger.warn('Order not found', { orderId: eventData.orderId });
      return;
    }

    if (order.status === 'PAID') {
      this.logger.warn('Order already paid', {
        orderId: order.id,
      });
      return;
    }
  }

  // mapper simple (adaptalo a MP / Stripe) - Extrar el mappers
  private mapPayload(
    payload: any,
  ): { orderId: string; status: 'APPROVED' | 'FAILED' } | null {
    const status = payload.status?.toLowerCase();

    // Estados terminales exitosos
    if (status === 'approved' || status === 'succeeded' || status === 'paid') {
      return { orderId: payload.metadata.orderId, status: 'APPROVED' };
    }

    // Estados terminales de fallo
    if (
      status === 'failed' ||
      status === 'rejected' ||
      status === 'cancelled'
    ) {
      return { orderId: payload.metadata.orderId, status: 'FAILED' };
    }

    // Estados intermedios: pending, in_process, authorized, etc.
    // No emitimos nada, solo logueamos y esperamos el siguiente webhook
    this.logger.debug('Ignoring non-terminal webhook status', {
      status,
      orderId: payload.metadata.orderId,
    });
    return null;
  }
}

// // # 🔐 3. (Opcional pero importante) Validación de firma
// // 👉 NO lo implementes ahora si estás probando pero sabé dónde va:
// // ```ts
// // private validateSignature(headers, payload) {
// //   const signature = headers['x-signature'];
// //
// //   // validar con secret del provider
// // }
