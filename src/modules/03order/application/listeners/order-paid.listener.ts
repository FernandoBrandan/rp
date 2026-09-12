import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '@common/events/event-names';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';
import { OrderRepository } from '@order/domain/repositories/order.repository';
import { StockPort } from '../ports/stock.port';
import { OrderPaidEvent } from '@common/events/';

@Injectable()
export class OrderPaidListener {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(STOCK_SERVICE) private readonly stockService: StockPort,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_PAID)
  async handle(event: OrderPaidEvent) {
    const order = await this.orderRepository.getOrderDetail(event.orderId);
    if (order) {
      order.pay();
      await this.orderRepository.update(order);
    }
    if (order?.reservationId) {
      await this.stockService.confirmReservation(order.reservationId);
      this.logger.info('Stock confirmed', { orderId: event.orderId });
    }
  }
}
