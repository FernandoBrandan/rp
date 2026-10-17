import { DomainValidationError, DomainRuleError } from './domain.error'

// --- Currency ---
export class InvalidCurrencyCodeError extends DomainValidationError {
  readonly code = 'INVALID_CURRENCY_CODE'
  constructor(received: string) {
    super(`Currency debe ser un código ISO 4217 de 3 letras mayúsculas (recibido: "${received}")`)
  }
}

// --- EntityId ---
export class InvalidEntityIdError extends DomainValidationError {
  readonly code = 'INVALID_ENTITY_ID'
  constructor() {
    super('EntityId no puede estar vacío')
  }
}

// --- ExternalReference ---
export class InvalidExternalReferenceError extends DomainValidationError {
  readonly code = 'INVALID_EXTERNAL_REFERENCE'
  constructor(reason: string) {
    super(`ExternalReference inválida: ${reason}`)
  }
}

// --- InitPoint ---
export class InvalidInitPointError extends DomainValidationError {
  readonly code = 'INVALID_INIT_POINT'
  constructor(reason: string) {
    super(`InitPoint inválido: ${reason}`)
  }
}

// --- ProviderPaymentId ---
export class InvalidProviderPaymentIdError extends DomainValidationError {
  readonly code = 'INVALID_PROVIDER_PAYMENT_ID'
  constructor(reason: string = 'debe ser un string no vacío de hasta 255 caracteres') {
    super(`ProviderPaymentId inválido: ${reason}`)
  }
}

// --- Money ---
export class CurrencyMismatchError extends DomainRuleError {
  readonly code = 'CURRENCY_MISMATCH'
  constructor() {
    super('No se pueden operar monedas distintas')
  }
}

export class InvalidAmountError extends DomainRuleError {
  readonly code = 'INVALID_AMOUNT'
  constructor() {
    super('El monto de un asiento debe ser positivo')
  }
}

export class InvalidProviderError extends DomainValidationError {
  readonly code = 'INVALID_PROVIDER'
  constructor(reason: string) {
    super(`PaymentPreference.provider inválido: ${reason}`)
  }
}

export class InvalidPreferenceExternalReferenceError extends DomainValidationError {
  readonly code = 'INVALID_PREFERENCE_EXTERNAL_REFERENCE'
  constructor(reason: string) {
    super(`PaymentPreference.externalReference inválida: ${reason}`)
  }
}

export class InvalidPreferenceAmountError extends DomainValidationError {
  readonly code = 'INVALID_PREFERENCE_AMOUNT'
  constructor(reason: string) {
    super(`PaymentPreference.amount inválido: ${reason}`)
  }
}

export class InvalidPreferenceInitPointError extends DomainValidationError {
  readonly code = 'INVALID_PREFERENCE_INIT_POINT'
  constructor(reason: string) {
    super(`PaymentPreference.initPoint inválido: ${reason}`)
  }
}

export class InvalidProviderPreferenceIdError extends DomainValidationError {
  readonly code = 'INVALID_PROVIDER_PREFERENCE_ID'
  constructor(reason: string) {
    super(`PaymentPreference.providerPreferenceId inválido: ${reason}`)
  }
}

export class WebhookSnapshotMismatchError extends DomainRuleError {
  readonly code = 'WEBHOOK_SNAPSHOT_MISMATCH'
  constructor(detail: string) {
    super(`Webhook snapshot no coincide con el Payment local → ${detail}`)
  }
}
