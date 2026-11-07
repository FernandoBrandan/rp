// src/modules/02cart/application/dto/response/cart.response.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDTO {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 'Laptop Gamer', required: false })
  name?: string;

  @ApiProperty({ example: 1500.99, required: false })
  price?: number;

  @ApiProperty({ example: 3001.98, required: false })
  subtotal?: number;
}

export class CartResponseDTO {
  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({ type: [CartItemResponseDTO] })
  items: CartItemResponseDTO[];

  @ApiProperty({ example: 2 })
  totalItems: number;

  @ApiProperty({ example: 3001.98, required: false })
  totalPrice?: number;
}
