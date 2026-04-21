// cart.mapper.ts
import { Cart } from '../../domain/cart.entity';
import { CartResponseDTO } from '../dto/dto.response/cartResponse.dto';

export class CartMapper {
  static toResponseDTO(cart: Cart): CartResponseDTO {
    return {
      userId: cart.userId,
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      totalItems: this.calculateTotalItems(cart.items),
    };
  }

  static toEnrichedResponseDTO(userId: string, items: any[]): CartResponseDTO {
    return {
      userId,
      items,
      totalItems: this.calculateTotalItems(items),
      totalPrice: Number(
        items.reduce((acc, item) => acc + (item.subtotal || 0), 0).toFixed(2),
      ),
    };
  }

  private static calculateTotalItems(items: any[]): number {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
