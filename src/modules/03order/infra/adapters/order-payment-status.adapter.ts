// src/modules/03order/infra/adapters/order-payment-status.adapter.ts

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@infra/tokens';
import { OrderRepository } from '@order/domain/repositories/order.repository';
import { OrderPaymentStatusPort } from '@payment/application/ports/order-payment-status.port';

@Injectable()
export class OrderPaymentStatusAdapter implements OrderPaymentStatusPort {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepo: OrderRepository,
  ) {}

  async markGenerating(orderId: string): Promise<void> {
    const order = await this.orderRepo.getOrderDetail(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.markPaymentGenerating();
    await this.orderRepo.update(order);
  }

  async markFailed(orderId: string): Promise<void> {
    const order = await this.orderRepo.getOrderDetail(orderId);
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    order.markPaymentFailed();
    await this.orderRepo.update(order);
  }
}
