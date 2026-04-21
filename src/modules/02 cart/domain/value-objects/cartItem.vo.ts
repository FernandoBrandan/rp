export class CartItem {
  constructor(
    public readonly productId: string,
    public quantity: number,
  ) {
    if (quantity <= 0) {
      throw new Error('Quantity must be > 0');
    }
  }
}
