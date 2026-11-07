// src/modules/02cart/domain/value-objects/cartItem.vo.ts

export class CartItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
  }

  withQuantity(quantity: number): CartItem {
    return new CartItem(this.productId, quantity);
  }

  addQuantity(amount: number): CartItem {
    return new CartItem(this.productId, this.quantity + amount);
  }
}
