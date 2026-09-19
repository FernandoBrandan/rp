# Playbook: E-commerce Modular y Resiliente

Guía reusable para construir un monolito modular con DDD light.
Cada fase es un entregable **completo, deployable y usable**.
No se avanza a la siguiente sin cerrar la anterior.

## Modelo de fases

| Fase | Foco           | Por qué en este orden                          |
| ---- | -------------- | ---------------------------------------------- |
| 0    | Infra base     | Sin esto no corre nada                         |
| 1    | MVP funcional  | Sin flujo usuario → orden no hay producto      |
| 2    | Resiliencia    | Antes de escalar, no romperse                  |
| 3    | Observabilidad | No podés mejorar lo que no ves                 |
| 4    | Performance    | Optimizar recién cuando hay algo que optimizar |
| 5    | Expansión      | Features de negocio extra                      |
| 6    | Escalabilidad  | Solo si el tráfico lo exige                    |

**Regla**: nunca abrir Fase N+1 con Fase N abierta.

---

## FASE 0 — Infra base

**Objetivo**: esqueleto ejecutable, sin features de negocio.

- Configuración por environment (`.env.dev` · `.env.prod`, `.env.example`)
- Logger mínimo (consola)
- Conexión a DB + migration:run (`synchronize: true` solo dev)
- Seed script — datos mínimos para desarrollo (1 admin, 3 productos)
- Manejo global de errores + ValidationPipe global
- Health check
- Graceful shutdown (Ctrl+C en la app cierra conexiones limpiamente)

- Docker básico (app + postgres + redis) - `Dockerfile`, `docker-compose.yml`
- Docker multi-stage build

- CI base — GitHub Actions corriendo lint + build + tests en cada PR
- Pipeline mínimo (tests → build → image → run) `.github/workflows/ci.yml`

**Conceptos a conocer**:

- 12-factor app (metodología detrás de la config por env)

---

## FASE 1 — MVP funcional

**Objetivo**: flujo completo Identity → Catalog → Cart → Ordering → Payment → Notification.
idempotencia, compensación y stock nunca negativo.

Regla de avance: cada bloque cierra con:

- dominio + infra + use cases + controller
- tests unitarios e integración si toca DB/Redis, smoke test manual o script
- CI en verde

- **Identity**: register, login, JWT, roles USER/ADMIN
- **Catalog**: CRUD productos, stock
- **Cart**: CRUD (solo DB, sin cache)
- **Ordering**: crear orden, 3 estados (PENDING/PAID/FAILED), idempotencia
- **Payment**: provider fake con delay configurable
- **Notification**: log a consola (no email real)
- **Inventory**: reserva + liberación (puede vivir dentro de Catalog)

**Dominio (DDD)**:

- Entity vs Value Object (`Money`, `Email`, `Serial`)
- Invariantes validadas en constructor y métodos
- Repository pattern (interface en `domain/`, implementación en `infra/`)
- Domain Service (lógica que no pertenece a una entidad)
- Dependency Inversion (ports + adapters entre BCs)
- Bounded Context
- Application Service / Use Case
- Anti-Corruption Layer (cada BC traduce el lenguaje del otro)
- X - Aggregate / Aggregate Root

**Consistencia**:

- Idempotency Key (`idempotencyKey` unique constraint)
- Race condition handling (`UPDATE ... WHERE stock >= qty`)
- Unique constraint a nivel DB
- Transacciones locales (una sola DB)
- Máquina de estados explícita (State pattern)
- Transiciones válidas vs inválidas
- Compensating transaction (versión mínima: si falla pago → liberar reserva)

**API / Auth**:

- DTOs + validation (`class-validator`)
- JWT access token bcrypt para passwords
- Guards (auth, roles)
- Middleware (correlation ID)
- Domain Events in-process (`EventEmitter2`)
- REST API design - Paginación básica

**Conceptos a conocer**:

- Optimistic vs Pessimistic locking (por qué preferimos atomic update)
- Event Sourcing (por qué NO en MVP)
- CQRS (por qué NO en MVP)

**NO incluye**: cache, retry, circuit breaker, métricas, shipping, notification real.

**Exit criteria**:

- flujo end-to-end funciona con doble submit (idempotencia OK).
- Doble submit del mismo `idempotencyKey` devuelve la misma orden
- Si el pago falla, la reserva de stock se libera
- El stock nunca queda negativo bajo concurrencia
- Endpoint protegido rechaza requests sin token

---

## FASE 2 — Resiliencia

**Objetivo**: el sistema no se rompe cuando algo externo falla.

**Conceptos a practicar — Patrones de resiliencia**:

- Timeout explícito (toda llamada externa)
- Retry con exponential backoff
- Jitter en retry (evita thundering herd)
- Circuit Breaker con 3 estados (CLOSED / OPEN / HALF_OPEN)
- Bulkhead (aislar cargas peligrosas)
- Graceful degradation (el sistema sigue funcionando parcial)
- Fallback (respuesta por defecto si todo falla)

**Conceptos a practicar — Consistencia avanzada**:

- Idempotent consumers (listeners que soportan at-least-once)
- Compensating transaction completa (rollback + refund stub)
- Reconciliation loop (cron que detecta estados huérfanos)
- Reordenamiento de efectos (stock primero, estado después)

**Conceptos a practicar — Testing de resiliencia**:

- Fault injection (forzar timeout, fallo, latencia)
- Simulación determinística (seed → mismo resultado)
- Chaos engineering básico (apagar servicios, medir recuperación)

**Conceptos a conocer**:

- Exactly-once vs at-least-once vs at-most-once (por qué at-least-once es lo viable)
- Dead letter queue (por qué no lo usamos todavía)
- Poison message (cómo se detectaría)
- Saga pattern (coreografía vs orquestación, por qué no aplica)
- Retry budget (limitar retries para no empeorar)

**Entregables**:

- `src/infra/resilience/`: `with-timeout.ts`, `with-retry.ts`, `circuit-breaker.ts`, `bulkhead.ts`
- `SimulatedPaymentProvider` con modo `flaky`
- `OrderReconciliationService` (cron)

- `infra/resilience/`: timeout, retry con backoff, breaker (propio)
- Aplicar a Payment (y Shipping cuando exista)
- Compensating transactions (si falla pago → liberar stock)
- Reconciliación con cron (órdenes huérfanas)
- Simulación 20% timeout / 10% fallo
- Idempotencia en todos los listeners
- Circuit breaker.
- Bulkhead. (aislar cargas peligrosas)
- Simulación de fallo de servicio de pagos.

**Exit criteria**:

- apagar el provider → el sistema se recupera sin perder datos.

- Con `FAKE_PAYMENT_TIMEOUT_RATE=0.20`, el error rate real < 2%
- El circuit breaker se abre tras 5 fallos consecutivos y se recupera
- Simular crash entre dos escrituras → el cron reconcilia
- Apagar Postgres 5 min → todas las órdenes terminan en estado consistente

---

- Consistencia:
- Compensating transaction para cancelaciones.
- Idempotency key en creación de órdenes.

---

## FASE 3 — Observabilidad

**Objetivo**: poder ver qué pasa en producción.

**Conceptos a practicar — Logs**:

- Structured logging (JSON puro, un objeto por línea)
- Correlation ID propagado por `AsyncLocalStorage`
- Log levels semánticos (info / warn / error / debug)
- Campos obligatorios: `timestamp`, `level`, `service`, `event`, `correlationId`

**Conceptos a practicar — Métricas**:

- Prometheus exposition format (`/metrics`)
- Counter, Gauge, Histogram
- RED method (Rate, Errors, Duration) por endpoint
- USE method (Utilization, Saturation, Errors) por recurso
- Cardinality (por qué `userId` como label es mala idea)
- SLI / SLO / Error budget

**Conceptos a practicar — Health**:

- Liveness (`/health/live`) vs Readiness (`/health/ready`)
- Readiness valida: DB + Redis + estado del circuit breaker
- Degraded mode (responder 200 con warning si un check no crítico falla)

**Conceptos a conocer**:

- Distributed tracing (spans, parent/child) — por qué no en monolito
- OpenTelemetry — qué resuelve
- Log sampling — cuándo aplicarlo

---

- Logs JSON estructurados (`timestamp`, `level`, `service`, `event`, `correlationId`)
- `correlationId` por request (AsyncLocalStorage)
- Métricas básicas Prometheus (`request_duration_ms`, `orders_created_total`, etc.)
- Métricas (latencia, errores por endpoint, throughput)
- Health separado: `/health/live` + `/health/ready`
- `/health/ready` valida: DB + Redis + estado del circuit breaker
- Readiness vs liveness.
- Traces simples (middleware que marca tiempos)

**Entregables**:

- `src/infra/metrics/` (módulo + servicio + interceptor)
- Logger migrado a JSON
- `GET /health/live` + `GET /health/ready`
- `GET /metrics`
- (Opcional) `docker-compose` con Prometheus + Grafana

**Exit criteria**: dashboard en Grafana muestra request rate + errores en vivo.

- Dashboard muestra request rate + errores en vivo
- Correlation ID une todos los logs de un request
- Matar Redis → `/health/ready` devuelve 503, `/health/live` sigue OK

---

## FASE 4 — Performance

**Objetivo**: aguantar picos de tráfico (Black Friday mindset).

**Conceptos a practicar — Cache**:

- Cache-aside pattern
- Write-through (escribir en cache y DB)
- TTL + invalidación explícita en writes
- Cache stampede prevention (lock o single-flight)
- Cache coherence (Redis ↔ DB)

**Conceptos a practicar — Base de datos**:

- Índices B-tree (single column)
- Índices compuestos (multi-columna, order matters)
- N+1 query problem (resolver con bulk / joins)
- Connection pooling
- EXPLAIN / query plan (medir antes de optimizar)

**Conceptos a practicar — Rate limiting**:

- Token bucket
- Sliding window
- Rate limit por usuario, IP, endpoint
- Load testing (autocannon o k6)

**Conceptos a conocer**:

- Read replicas (concepto)
- Sharding (concepto)
- OLTP vs OLAP (por qué una DB no sirve para ambos)
- Stale-while-revalidate (variante de cache)
- Backpressure
- Load shedding

---

- Cache de productos en Redis (TTL 5 min, invalidación en writes)
- Cache de cart en Redis (fuente primaria, DB respaldo)
- Paginación en listados
- Rate limiting en endpoints públicos
- Índices DB revisados

**Exit criteria**: k6 con 1000 RPS → p95 < 500ms.

- `GET /products` cacheado: p95 < 100ms
- k6 con 1000 RPS → p95 < 500ms
- Rate limit corta a 429 después del umbral
- `EXPLAIN` de las queries críticas muestra uso de índice

---

## FASE 5 — Expansión

**Objetivo**: features de negocio extra.

- **Shipping**: cálculo de costo + tracking + mock carrier
- **Notification real**: email (SMTP / proveedor)
- Estados `SHIPPED` / `DELIVERED` en Order
- Admin panel / endpoints admin

**Conceptos a practicar**:

- Adapter pattern (reforzado: múltiples providers)
- Anti-Corruption Layer (traducir API externa a modelo propio)
- Webhook receiver con validación HMAC
- Webhook idempotency (evitar procesar el mismo dos veces)
- Polling fallback (pull por si el webhook no llega)
- Feature flags
- Template rendering (email)
- Multi-channel routing

**Conceptos a conocer**:

- Batch processing
- Idempotency en webhooks (replay attacks)

**Entregables**:

- BC Shipping completo
- BC Notification con canal email real
- Estados `SHIPPED` / `DELIVERED` en Order
- Endpoints admin (si aplica)

**Exit criteria**:

- Crear orden → pagar → despachar → entregar (flujo end-to-end)
- Webhook de shipping actualiza tracking

---

## FASE 6 — Escalabilidad

**No hacer por las dudas. Solo si el tráfico lo exige..**

- Outbox pattern (si perdés eventos)
- Read replicas (si la DB es el cuello)
- Message broker (si EventEmitter2 no alcanza)
- Separación de Billing como servicio

**Conceptos a practicar**:

- Transactional outbox (para eventos críticos)
- Idempotent consumer (profundizado: dedup persistente)

**Conceptos a conocer** (mencionar y justificar por qué NO):

- Message broker (Kafka / RabbitMQ) — cuándo sí, cuándo no
- CQRS — separar lectura de escritura
- Event Sourcing — modelo basado en eventos
- CAP theorem — trade-offs de consistencia
- Service discovery — en microservicios
- API Gateway — punto único de entrada
- BFF (Backend for Frontend) — API por cliente
- GraphQL vs REST — cuándo cada uno
- Sharding — particionar datos

**Regla**: esta fase casi todo es 📖. El objetivo es **saber qué existe y por qué no lo usamos**.

## Próximas mejoras (backlog técnico)

- Circuit breaker real (opossum o similar)
- Simulación de carga (k6 o autocannon)
- Separación de Billing como servicio independiente si el tráfico lo exige
- Métricas de negocio en Grafana
- Migración a monorepo (si crecen los equipos)
