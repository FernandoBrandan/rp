import { Injectable, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventNames } from '@common/events/event-names';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { StockPort } from '../ports/stock.port';
import { OrderPaymentFailedEvent } from '../../domain/events/order-payment-failed.event';

@Injectable()
export class OrderPaymentFailedListener {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(STOCK_SERVICE) private readonly stockService: StockPort,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  @OnEvent(EventNames.ORDER_PAYMENT_FAILED)
  async handle(event: OrderPaymentFailedEvent) {
    const order = await this.orderRepository.getOrderDetail(event.orderId);
    if (order && order.reservationId) {
      await this.stockService.releaseReservation(order.reservationId);
      order.fail();
      await this.orderRepository.update(order);
    }
  }
}
