// src/infra/tokens/index.ts

export const LOGGER = Symbol('LOGGER');
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const JWT_SERVICE = Symbol('JWT_SERVICE');
export const HASH_SERVICE = Symbol('HASH_SERVICE');

// ---------------------------------------------------------------------------------

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
export const USER_FINDER = Symbol('USER_FINDER');

// ---------------------------------------------------------------------------------

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
export const PRODUCT_CHECKER = Symbol('PRODUCT_CHECKER');
export const PRODUCT_FINDER = Symbol('PRODUCT_FINDER');

export const STOCK_SERVICE = Symbol('STOCK_SERVICE');

// ---------------------------------------------------------------------------------

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');
// export const CartRepositoryToken = Symbol('CartRepository')

// ---------------------------------------------------------------------------------

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_FINDER = Symbol('ORDER_FINDER');

export const REFUND_SERVICE = Symbol('REFUND_SERVICE');

// ---------------------------------------------------------------------------------

export const EVENT_CONSUMER = Symbol('EVENT_CONSUMER');
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export const EVENT_PUBLISHER_HEALTH = Symbol('EVENT_PUBLISHER_HEALTH');
// ---------------------------------------------------------------------------------

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
export const PAYMENT_CIRCUIT_BREAKER_HEALTH = Symbol('PAYMENT_CIRCUIT_BREAKER_HEALTH');

// ---------------------------------------------------------------------------------

/*

### `src/infra/tokens/index.ts` — template

```ts
// ============================================================================
// DI Tokens
// ============================================================================
// Interfaces de TS se borran en runtime. NestJS necesita un valor runtime.
// Convención: <CONCEPTO>_REPOSITORY / <CONCEPTO>_SERVICE / <CONCEPTO>_PORT.
// ============================================================================

// ─── cross-cutting (idéntico en los 4) ─────────────────────────────────
export const LOGGER = Symbol("LOGGER");
export const REDIS_CLIENT = Symbol("REDIS_CLIENT");
export const HASH_SERVICE = Symbol("HASH_SERVICE");
export const TOKEN_SERVICE = Symbol("TOKEN_SERVICE");
export const EVENT_PUBLISHER = Symbol("EVENT_PUBLISHER");
export const EVENT_CONSUMER = Symbol("EVENT_CONSUMER");
export const EVENT_PUBLISHER_HEALTH = Symbol("EVENT_PUBLISHER_HEALTH");

// ─── project-specific (cada proyecto agrega los suyos) ─────────────────
// ecommerce:
//   USER_REPOSITORY, USER_FINDER, PRODUCT_REPOSITORY, PRODUCT_CHECKER,
//   PRODUCT_FINDER, STOCK_SERVICE, CART_REPOSITORY, ORDER_REPOSITORY,
//   ORDER_FINDER, REFUND_SERVICE, PAYMENT_PROVIDER,
//   PAYMENT_CIRCUIT_BREAKER_HEALTH
//
// payment:
//   PAYMENT_PROVIDER, PAYMENT_REPOSITORY, PAYMENT_PREFERENCE_REPOSITORY,
//   WEBHOOK_EVENT_REPOSITORY
//
// psp:
//   AUTH_USER_REPOSITORY, USER_PROFILE_REPOSITORY, MERCHANT_PROFILE_REPOSITORY,
//   MERCHANT_REQUEST_REPOSITORY, API_CLIENT_REPOSITORY, API_CREDENTIAL_REPOSITORY,
//   PAYMENT_REPOSITORY, PROVIDER_USER_REPOSITORY, WEBHOOK_PUBLISHER,
//   UNIT_OF_WORK, LEDGER_PORT, CHECKOUT_BASE_URL
//
// ledger:
//   (los que correspondan)
```
 */
