// src/common/exceptions/infrastructure.exception.ts
export class InfrastructureException extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'InfrastructureException';
  }
}
