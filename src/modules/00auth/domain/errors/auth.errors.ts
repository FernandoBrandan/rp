// src/modules/00auth/domain/errors/auth.errors.ts
import { DomainAuthError, DomainConflictError } from '@common/domain/errors';

export class InvalidCredentialsError extends DomainAuthError {
  readonly code = 'invalid_credentials';
  constructor() {
    super('Invalid credentials');
  }
}
export class EmailAlreadyRegisteredError extends DomainConflictError {
  readonly code = 'email_already_registered';
  constructor() {
    super('Email already registered');
  }
}
