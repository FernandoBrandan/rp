// src/modules/03order/infra/services/order-finder.service.ts

import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@infra/tokens';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderFinderPort } from '../../application/ports/order-finder.port';

@Injectable()
export class OrderFinderService implements OrderFinderPort {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
  ) {}

  async findById(orderId: string) {
    const order = await this.orderRepo.getOrderDetail(orderId);
    if (!order) return null;
    return {
      id: order.id,
      total: order.total.getValue(),
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      status: order.status,
    };
  }
}
