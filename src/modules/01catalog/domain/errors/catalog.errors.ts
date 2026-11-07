// src/modules/01catalog/domain/errors/catalog.errors.ts
import {
  DomainConflictError,
  DomainNotFoundError,
  DomainRuleError,
  DomainValidationError,
} from '@common/domain/errors';

// export class ProductNotFoundError extends DomainNotFoundError {
//   readonly code = 'product_not_found';
//   constructor(serial: string) {
//     super(`Product not found: ${serial}`);
//   }
// }
export class SerialAlreadyExistsError extends DomainConflictError {
  readonly code = 'serial_already_exists';
  constructor(serial: string) {
    super(`Serial already exists: ${serial}`);
  }
}
export class InvalidProductSerialError extends DomainValidationError {
  readonly code = 'invalid_product_serial';
  constructor() {
    super('Invalid serial format. Must start with PROD-');
  }
}
export class ProductInactiveError extends DomainRuleError {
  readonly code = 'product_inactive';
  constructor() {
    super('Product is inactive');
  }
}
export class InsufficientStockError extends DomainRuleError {
  readonly code = 'insufficient_stock';
  constructor(public readonly productId: string) {
    super(`Insufficient stock for product ${productId}`);
  }
}
export class ProductNameEmptyError extends DomainValidationError {
  readonly code = 'product_name_empty';
  constructor() {
    super('Product name cannot be empty');
  }
}
export class InvalidStockError extends DomainValidationError {
  readonly code = 'invalid_stock';
  constructor() {
    super('Invalid stock');
  }
}
