// src/modules/02cart/application/dto/response/cart.response.dto.ts

export interface CartItemResponseDTO {
  productId: string;
  quantity: number;
  name?: string;
  price?: number;
  subtotal?: number;
}

export interface CartResponseDTO {
  userId: string;
  items: CartItemResponseDTO[];
  totalItems: number;
  totalPrice?: number;
}
