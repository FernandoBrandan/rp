export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

export abstract class DomainValidationError extends DomainError {}
export abstract class DomainConflictError extends DomainError {}
export abstract class DomainRuleError extends DomainError {}

export class DomainNotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'
  constructor(resource: string, id: string) {
    super(`${resource} ${id} no encontrado`)
  }
}
