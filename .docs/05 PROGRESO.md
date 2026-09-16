# Progreso

## Fase 0 — Infra base

- [x] Config por environment
- [x] Structured logging mínimo
- [x] Error handling global
- [x] ValidationPipe
- [ ] Migrations
- [ ] Graceful shutdown
- [ ] Docker + compose
- [ ] CI básico
- [ ] Seed script
- [ ] `.env.example`

## Fase 1 — MVP

### Identity

- [ ] User entity + Email VO
- [ ] Register / Login / Me
- [ ] JWT + guards

### Catalog

- [x] Product + Money + Serial VOs
- [x] CRUD
- [ ] Paginación

### Cart

- [x] Add / Remove / Update
- [x] Validación contra Catalog

### Ordering

- [x] CreateOrder con idempotencia
- [x] Estados básicos
- [ ] Compensación de reserva

### Inventory

- [x] Reserva atómica (`WHERE stock >= qty`)
- [x] Liberar si falla

### Payment

- [x] Provider fake
- [ ] Timeout
- [ ] Simulación 20%/10%

---

---

---

## Fase 2 — Resiliencia

- [ ] Timeout explícito
- [ ] Retry con backoff + jitter
- [ ] Circuit breaker
- [ ] Bulkhead
- [ ] Idempotent listeners
- [ ] Compensating transaction completa
- [ ] Reconciliation cron
- [ ] Fault injection (20% / 10%)
- [ ] Chaos básico

## Fase 3 — Observabilidad

- [ ] Logs JSON puros
- [ ] Correlation ID en todos los logs
- [ ] Métricas Prometheus
- [ ] RED method por endpoint
- [ ] SLI / SLO definidos
- [ ] Health live / ready
- [ ] Dashboard Grafana

## Fase 4 — Performance

- [ ] Cache-aside en productos
- [ ] Invalidación en writes
- [ ] Cache en cart (Redis primario)
- [ ] Índices DB revisados
- [ ] Rate limiting
- [ ] Load testing (k6)

## Fase 5 — Expansión

- [ ] BC Shipping
- [ ] BC Notification real
- [ ] Estados SHIPPED / DELIVERED
- [ ] Webhook HMAC
- [ ] Feature flags

## Fase 6 — Escalabilidad

- [ ] Transactional outbox

## Testing

- [ ] Unit tests dominio (cobertura 90%)
- [ ] Unit tests use cases
- [ ] Integration tests repos
- [ ] E2E por controller
- [ ] Test idempotencia (doble submit)
- [ ] Test de fallo de pago
- [ ] Coverage global ≥ 70%

---

---

---

### Resiliencia (pendiente)

| Patrón                      | Dónde                             |
| --------------------------- | --------------------------------- |
| Timeout explícito           | Payment, Shipping                 |
| Retry + backoff exponencial | Payment, Shipping                 |
| Circuit Breaker             | Payment, Shipping                 |
| Bulkhead lógico             | Pool de conexiones externas       |
| Idempotency Key             | Creación de órdenes               |
| Compensating Transaction    | Rollback de reserva si pago falla |

Escenarios modelados para testear resiliencia

- Fallo del proveedor de pago
- Timeout externo en shipping
- Reintentos con backoff
- Picos de lectura en catálogo (cache hit/miss)
- Intento de transición de estado inválida en orden
- Doble submit de la misma orden (idempotencia)

### Seguridad

- Rate limiting en endpoints públicos
- Validación estricta de DTOs
- Hash de contraseñas (bcrypt)
- Sin stack traces en respuestas de producción
