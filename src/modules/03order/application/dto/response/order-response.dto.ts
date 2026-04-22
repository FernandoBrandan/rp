// src/modules/03order/application/dto/response/order-response.dto.ts

export class OrderItemResponseDTO {
  productId: string;
  quantity: number;
  price: number;
}

export class OrderResponseDTO {
  id: string;
  userId: string;
  status: string;
  total: number;
  items: OrderItemResponseDTO[];
  paymentUrl?: string;

  static fromDomain(order: any): OrderResponseDTO {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total.getValue(),
      items: order.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price.getValue(),
      })),
      paymentUrl: order.paymentUrl,
    };
  }
}
