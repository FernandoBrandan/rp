import { Inject, Injectable } from '@nestjs/common';
import { ORDER_REPOSITORY } from '@infra/tokens';
import { OrderRepository as PaymentOrderContract } from '@payment/application/ports/order.port';
import { OrderRepository as InternalOrderRepo } from '../../domain/repositories/order.repository';

@Injectable()
export class OrderPaymentProvider implements PaymentOrderContract {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly internalRepo: InternalOrderRepo,
  ) {}

  async findById(orderId: string) {
    const order = await this.internalRepo.getOrderDetail(orderId);
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
