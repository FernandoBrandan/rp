// src/modules/03order/application/mappers/order.mapper.ts
import { Order } from '@order/domain/order.entity';
import { OrderResponseDTO } from '../dto/response/order-response.dto';

export class OrderMapper {
  static toResponse(order: Order): OrderResponseDTO {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total.getValue(),
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.getValue(),
      })),
      paymentUrl: order.paymentUrl,
    };
  }
}
