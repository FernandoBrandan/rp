// src/modules/02cart/domain/errors/cart.errors.ts
import { DomainNotFoundError, DomainRuleError } from '@common/domain/errors';

// export class CartNotFoundError extends DomainNotFoundError {
//   readonly code = 'cart_not_found';
//   constructor() {
//     super('Cart not found');
//   }
// }
export class CartItemNotFoundError extends DomainRuleError {
  readonly code = 'cart_item_not_found';
  constructor() {
    super('Item not found in cart');
  }
}
export class InvalidCartQuantityError extends DomainRuleError {
  readonly code = 'invalid_cart_quantity';
  constructor() {
    super('Quantity must be a positive integer');
  }
}
