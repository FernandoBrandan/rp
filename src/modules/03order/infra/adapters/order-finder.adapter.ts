// src/modules/03order/infra/adapters/order-finder.adapter.ts

import { Inject, Injectable } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@infra/tokens';
import { OrderRepository } from '@order/domain/repositories/order.repository';
import { OrderFinderPort } from '@payment/application/ports/order-finder.port';
import { PaymentOrderSnapshot } from '@payment/application/ports/payment-provider.port';

@Injectable()
export class OrderFinderAdapter implements OrderFinderPort {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
  ) {}

  async findById(orderId: string): Promise<PaymentOrderSnapshot | null> {
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
      paymentUrl: order.paymentUrl,
    };
  }
}
