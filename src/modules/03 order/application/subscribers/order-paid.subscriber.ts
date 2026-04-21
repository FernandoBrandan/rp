import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';

import { OrderRepository } from '@order/domain/repositories/order.repository';

import { OrderPaidEvent } from '../../domain/events/order-paid.event';
import { StockService } from '../ports/stock.port';

@Injectable()
export class OrderPaidSubscriber {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockService,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  @OnEvent('order.paid')
  async handleOrderPaid(event: OrderPaidEvent) {
    this.logger.info('FLOW 3 Estado PAID: OrderPaid event received', {
      orderId: event.orderId,
    });

    const order = await this.orderRepository.getOrderDetail(event.orderId);
    if (order) {
      order.pay();
      await this.orderRepository.update(order);
      this.logger.info('Order status updated to PAID', { orderId: order.id });
    }

    if (order.reservationId) {
      await this.stockService.confirmReservation(order.reservationId);
      this.logger.info('Stock confirmed', {
        orderId: order.id,
        reservationId: order.reservationId,
      });
    }

    // 🔥 FUTURO:
    // inventory.confirm()
    // cart.clear()
    // notifications.send()
  }
}
