import { Cart } from '../cart.entity';

export interface CartRepository {
  getCart(userId: string): Promise<Cart | null>;
  save(cart: Cart): Promise<void>;
  clear(userId: string): Promise<void>;
}

export const CartRepositoryToken = Symbol('CartRepository');
