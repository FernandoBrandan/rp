// src/modules/03order/application/mappers/order.mapper.ts
import { Order } from '@main/modules/03order/domain/order.entity'
import { OrderResponseDTO } from '../dto/response/order-response.dto'

export class OrderMapper {
  static toResponse(order: Order): OrderResponseDTO {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total.toNumber(),
      currency: order.currency.toString(), // ← NUEVO
      items: order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.toNumber(),
      })),
      paymentUrl: order.paymentUrl,
    }
  }
}
