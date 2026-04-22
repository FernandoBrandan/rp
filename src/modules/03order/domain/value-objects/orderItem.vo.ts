// src/modules/03order/domain/value-objects/orderItem.vo.ts
import { Money } from './money.vo';

export class OrderItem {
  constructor(
    public readonly productId: string,
    public readonly quantity: number,
    public readonly price: Money,
  ) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
  }

  subtotal(): Money {
    return this.price.multiply(this.quantity);
  }
}
