// src/common/domain/errors/domain.error.ts

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// ── Categorías (mapean 1:1 a HTTP status en el filtro) ─────────────────
export abstract class DomainValidationError extends DomainError {} // 400
export abstract class DomainAuthError extends DomainError {} // 401
export abstract class DomainForbiddenError extends DomainError {} // 403
export abstract class DomainConflictError extends DomainError {} // 409
export abstract class DomainRuleError extends DomainError {} // 422

// 404
export class DomainNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  constructor(resource: string, id: string) {
    super(`${resource} ${id} no encontrado`);
  }
}
