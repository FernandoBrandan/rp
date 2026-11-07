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
    const idx = this.items.findIndex((i) => i.productId === item.productId);

    if (idx !== -1) {
      this.items[idx] = this.items[idx].addQuantity(item.quantity);
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
    const idx = this.items.findIndex((i) => i.productId === productId);
    if (idx === -1) throw new Error('Item not found');
    this.items[idx] = this.items[idx].withQuantity(quantity);
  }
}
