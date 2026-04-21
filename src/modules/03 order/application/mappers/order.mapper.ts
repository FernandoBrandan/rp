import { Order } from '../../domain/order.entity';
import { OrderResponseDTO } from '../dto/dto.response/orderResponse.dto';

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
    };
  }
}
