// src/modules/03order/application/use-cases/create-order.use-case.ts
import { Injectable, Inject, HttpException } from '@nestjs/common';
import { Logger } from '@infra/logger/logger.interface';

import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/value-objects/orderItem.vo';
import { Money } from '../../domain/value-objects/money.vo';

import { OrderRepository } from '../../domain/repositories/order.repository';

import { CreateOrderDTO } from '../dto/request/create-order.dto';
import { OrderResponseDTO } from '../dto/response/order-response.dto';

import { OrderIdGenerator } from '../../infra/services/order-id-generator.service';
import { StockPort } from '../ports/stock.port';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { EventNames } from '@common/events/event-names';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly eventEmitter: EventEmitter2,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockPort,

    private readonly orderIdGenerator: OrderIdGenerator,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    this.logger.info('Create Order', {
      idempotencyKey: dto.idempotencyKey,
      userId: dto.userId,
    });

    const existingOrder = await this.orderRepository.findByIdempotencyKey(
      dto.idempotencyKey,
    );

    if (existingOrder) {
      if (!existingOrder.paymentUrl) {
        this.eventEmitter.emit(
          EventNames.ORDER_CREATED,
          new OrderCreatedEvent(existingOrder.id),
        );

        throw new HttpException(
          'Payment link being generated, please retry',
          202,
        );
      }
      return OrderResponseDTO.fromDomain(existingOrder);
    }

    const orderId = await this.orderIdGenerator.generate();

    const items = dto.items.map(
      (i) => new OrderItem(i.productId, i.quantity, new Money(i.price)),
    );

    const reservationId = await this.stockService.reserveStock(
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      orderId,
    );

    const order = Order.create({
      id: orderId,
      userId: dto.userId,
      idempotencyKey: dto.idempotencyKey,
      items,
      reservationId,
    });
    await this.orderRepository.createOrder(order);

    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order.id));

    this.logger.info('Order Created', {
      idempotencyKey: dto.idempotencyKey,
      userId: dto.userId,
    });
    return OrderResponseDTO.fromDomain(order);
  }
}
