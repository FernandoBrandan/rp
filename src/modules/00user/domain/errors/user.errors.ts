// src/modules/00user/domain/errors/user.errors.ts
import { DomainNotFoundError, DomainValidationError } from '@common/domain/errors';

// export class UserNotFoundError extends DomainNotFoundError {
//   readonly code = 'user_not_found';
//   constructor(id?: string) {
//     super(id ? `User not found: ${id}` : 'User not found');
//   }
// }
export class InvalidEmailError extends DomainValidationError {
  readonly code = 'invalid_email';
  constructor() {
    super('Invalid email');
  }
}
