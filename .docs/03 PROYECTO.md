# Proyecto: E-commerce Modular

Instancia concreta del Playbook aplicada a un e-commerce.

## BCs de un vistazo

### Núcleo (el corazón del sistema)

- Identity [modulos/01](./modulos/02-catalog.md)
- Ordering [modulos/04](./modulos/02-catalog.md)
- Payment [modulos/05](./modulos/02-catalog.md)
- Inventory [modulos/09](./modulos/02-catalog.md)
- Shipping [modulos/08](./modulos/02-catalog.md)

### Soporte (habilitan el núcleo)

- Catalog [modulos/02](./modulos/02-catalog.md)
- Cart [modulos/03](./modulos/02-catalog.md)
- Notification [modulos/07](./modulos/02-catalog.md)

**Regla**: el núcleo se construye primero. Los accesorios se construyen cuando el núcleo ya funciona end-to-end.

## Patrones transversales (completar las faltantes)

### Testing

- Unit tests en casos de uso
- Integration tests entre módulos
- Tests simulando fallos de payment
- Tests de idempotencia (doble submit de orden)
- Coverage mínimo: 70%
- Pruebas de integración entre módulos
- Tests de fallos (simular timeout Payment/Carrier)
- Tests de contrato (API spec + test)

### Consistencia

- **Idempotency Key**: obligatoria en `POST /orders` → ver ADR-006
- **Compensating Transaction**: al fallar pago o cancelar desde PAID → ver ADR-007
- **At-least-once**: en listeners → ver ADR-002

Aplican a: Ordering, Payment, Inventory.

### Comunicación entre BCs

- **Sin FKs cross-BC**: solo IDs, nunca foreign keys → ver ADR-008
- **Puertos + adapters**: cada BC expone su puerto, implementa el del otro → ver ADR-009

### Estados

- **Order** y **Payment** son máquinas de estado ortogonales (no se colapsan) → ver modulos/04

### Resiliencia

- **Timeout, retry, breaker** en llamadas externas → ver PLAYBOOK Fase 2

### SLI / SLO definidos (ni idea porque esta aca)

| SLI                           | SLO                                |
| ----------------------------- | ---------------------------------- |
| Latencia de creación de orden | 95% < 500ms                        |
| Error rate en pagos           | < 2% (excluyendo fallos simulados) |

Error budget: definir cuánto fallo es aceptable antes de frenar nuevos releases.
