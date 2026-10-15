// src/infra/resilience/index.ts
export * from './timeout'
export * from './retry'
export * from './circuit-breaker'
export * from './bulkhead'

//pendientes

// Pieza Fase 2	Estado
// Timeout	✅
// Retry con backoff + jitter	✅
// Circuit breaker	✅
// Fake con flaky/timeout	✅
// Composición Breaker(Retry(Timeout))	✅
// Listeners defensivos	✅
// Bulkhead	✅
// Reconciliación (cron)	✅
// Compensating transaction completa (CancelOrder)	✅
// TRANSITIONS centralizado	✅
// Estado en /health/ready	⬜
