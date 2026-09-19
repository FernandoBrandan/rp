# Progreso

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

### Seguridad

- Rate limiting en endpoints públicos
- Validación estricta de DTOs
- Hash de contraseñas (bcrypt)
- Sin stack traces en respuestas de producción
