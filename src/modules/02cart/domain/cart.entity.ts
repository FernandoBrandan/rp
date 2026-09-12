// src/modules/02cart/domain/cart.entity.ts

import { CartItem } from './value-objects/cartItem.vo';

export interface ICart {
  userId: string;
  items: CartItem[];
}

export class Cart {
  constructor(
    public readonly userId: string,
    public items: CartItem[] = [],
  ) {}

  addItem(item: CartItem) {
    const existing = this.items.find((i) => i.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
      return;
    }

    this.items.push(item);
  }

  removeItem(productId: string) {
    const exists = this.items.some((i) => i.productId === productId);
    if (!exists) throw new Error('Item not found');
    this.items = this.items.filter((i) => i.productId !== productId);
  }

  updateQuantity(productId: string, quantity: number) {
    const item = this.items.find((i) => i.productId === productId);
    if (!item) throw new Error('Item not found');

    item.quantity = quantity;
  }
}
