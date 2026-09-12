// src/modules/03order/application/dto/response/order-response.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@order/domain/enums/orderStatus.enum';

export class OrderItemResponseDTO {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 1500.99 })
  price: number;
}

export class OrderResponseDTO {
  @ApiProperty({ example: 'ORDER-20260101-0001' })
  id: string;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  status: string;

  @ApiProperty({ example: 3001.98 })
  total: number;

  @ApiProperty({ type: [OrderItemResponseDTO] })
  items: OrderItemResponseDTO[];

  @ApiProperty({ example: 'http://fake-payment/ORDER-...', required: false })
  paymentUrl?: string;
}
