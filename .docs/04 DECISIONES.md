# Decisiones arquitectónicas (ADRs)

## ADR-001: Monolito modular vs microservicios

**Decisión**: monolito modular, un solo deploy.
**Por qué**: el objetivo es demostrar criterio, no sumar complejidad operativa.
**Consecuencia**: si un BC crece, se puede extraer después.

## ADR-002: EventEmitter2 en vez de broker externo

**Decisión**: eventos in-process con `@nestjs/event-emitter`.
**Por qué**: MVP no necesita garantías de entrega reales.
**Consecuencia**: los listeners no son transaccionales. Mitigado con
idempotencia + cron de reconciliación (Fase 2).

## ADR-003: Cache NO en Fase 1

**Decisión**: cache recién en Fase 4.
**Por qué**: sin tráfico real no hay hit rate que justifique cache.
**Consecuencia**: MVP más lento, pero menos superficie de bugs.

## ADR-004: FAILED es estado terminal en MVP

**Decisión**: `FAILED → PENDING` no existe hasta Fase 5.
**Por qué**: retry de pago requiere lógica de "nuevo intento" que no aporta al MVP.
**Consecuencia**: si el pago falla, se cancela y se crea orden nueva.

## ADR-005: Payment asíncrono con link de pago (no síncrono)

**Contexto**: se evaluó cobrar dentro del request de checkout
(modelo síncrono). Se descartó porque el provider objetivo
(MercadoPago) funciona con link de pago: el usuario es redirigido
y el pago se confirma por webhook.

**Decisión**: flujo asíncrono. La orden pasa por `PENDING → 
WAITING_PAYMENT` antes de `PAID`. Un listener genera el link;
un webhook confirma el pago.

**Alternativas**:

- Síncrono: válido para providers con cobro server-side (Stripe
  PaymentIntent), inviable para link de pago (MercadoPago, PayPal).
- Saga distribuida: overkill para monolito.

**Consecuencia**: existe un estado intermedio (`WAITING_PAYMENT`)
que hay que modelar. Se resuelve con idempotencia + reconciliación.

## ADR-006: Idempotency Key como requisito de creación de órdenes

**Contexto**: el cliente puede reintentar (doble click, retry de red,
timeout de su lado). Sin protección, cada retry crea una orden nueva.

**Decisión**: `CreateOrder` requiere `idempotencyKey` provista por el cliente.
Implementación:

- Campo `idempotencyKey` con unique constraint en `orders`
- Chequeo previo `findByIdempotencyKey()` (camino rápido)
- Catch de `23505` (race condition) → devolver la orden existente

**Alternativas**:

- Hash del body del request como key → frágil si el body cambia legítimamente
- Solo chequeo en memoria → no sirve con múltiples instancias

**Consecuencia**: el cliente DEBE enviar `idempotencyKey`. Si no lo hace,
se rechaza la request.

## ADR-007: Compensating Transaction en cancelaciones y fallos de pago

**Contexto**: no hay transacción ACID que cruce Order e Inventory.
Si el pago falla después de reservar stock, la reserva queda huérfana.

**Decisión**: cada operación de escritura en múltiples BCs tiene su
contraparte compensatoria:

- Pago falla → `releaseReservation(order.reservationId)`
- Orden cancelada desde PAID → `releaseReservation` + refund (stub MVP)
- Si la compensación falla → cron de reconciliación (Fase 2)

**Alternativas**:

- Saga distribuida con orquestador → overkill para monolito
- Transacción 2PC → no soportado por Postgres nativo entre schemas lógicos

**Consecuencia**: el sistema converge a consistencia eventual en ≤ 1 min.

## ADR-008: Sin FKs cross-BC

## ADR-009: Puertos + adapters (hexagonal mínima)

## ADR-010: Structured logging (por qué JSON y no texto)

## ADR-011: Health separado (live / ready)

## ADR-012: SimulatedPaymentProvider en lugar de FakePaymentProvider
