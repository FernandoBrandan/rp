import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderPaymentFailedEvent } from '@payment/domain/events/Order.paymentFailed.event';

import { StockService } from '@order/application/ports/stock.port';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';
import { Logger } from '@infra/logger/logger.interface';
import { OrderRepository } from '@order/domain/repositories/order.repository';

@Injectable()
export class OrderPaymentFailedSubscriber {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
    @Inject(STOCK_SERVICE)
    private readonly stockService: StockService,
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent('order.payment_failed')
  async handle(event: OrderPaymentFailedEvent) {
    this.logger.info('Order payment failed - releasing stock', {
      orderId: event.orderId,
      reason: event.reason,
    });

    const order = await this.orderRepository.getOrderDetail(event.orderId);
    if (!order) {
      this.logger.warn('Order not found for release stock', {
        orderId: event.orderId,
      });
      return;
    }

    // 1. Liberar stock si existe una reserva asociada
    if (order.reservationId) {
      try {
        await this.stockService.releaseReservation(order.reservationId);
        this.logger.info('Stock released successfully', {
          orderId: order.id,
          reservationId: order.reservationId,
        });
      } catch (error) {
        this.logger.error('Failed to release stock', {
          orderId: order.id,
          reservationId: order.reservationId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Dependiendo de tu lógica, podrías encolar reintento o alertar
      }
    } else {
      this.logger.warn('No reservationId found, cannot release stock', {
        orderId: order.id,
      });
    }

    if (order.status !== 'FAILED') {
      order.fail();
      await this.orderRepository.update(order);
      this.logger.info('Order status updated to FAILED', { orderId: order.id });
    }
  }
}
