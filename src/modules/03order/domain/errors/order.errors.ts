// src/modules/03order/domain/errors/order.errors.ts
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainRuleError,
  DomainValidationError,
} from '@common/domain/errors';

// export class OrderNotFoundError extends DomainNotFoundError {
//   readonly code = 'order_not_found';
//   constructor(id: string) {
//     super(`Order not found: ${id}`);
//   }
// }
export class OrderNotCancellableError extends DomainConflictError {
  readonly code = 'order_not_cancellable';
  constructor(status: string) {
    super(`Cannot cancel order in status ${status}`);
  }
}
export class OrderMustHaveItemsError extends DomainRuleError {
  readonly code = 'order_must_have_items';
  constructor() {
    super('Order must have at least one item');
  }
}
export class CurrencyMismatchInOrderError extends DomainRuleError {
  readonly code = 'order_currency_mismatch';
  constructor() {
    super('Order items currency mismatch');
  }
}
export class OrderItemInvalidQuantityError extends DomainRuleError {
  readonly code = 'order_item_invalid_quantity';
  constructor() {
    super('Quantity must be greater than 0');
  }
}
export class PaymentLinkGeneratingError extends DomainConflictError {
  readonly code = 'payment_link_generating';
  constructor() {
    super('Payment link being generated, please retry');
  }
}
