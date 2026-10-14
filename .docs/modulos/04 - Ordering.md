# Ordering
* **Decisiones** 
  + [x] Dos máquinas de estado **ortogonales** : `OrderStatus` + `PaymentStatus`
  + [ ] `FAILED` es terminal en MVP (retry en Fase 5)
  + [x] Idempotencia por `idempotencyKey` (unique constraint)
  + [x] Compensación al fallar pago (liberar reserva)
  + [x] `PAID → FAILED` **no** es válido

* **Estados** 
  + `OrderStatus`: PENDING · WAITING_PAYMENT · PAID · COMPLETED · FAILED · CANCELLED
  + `PaymentStatus`: PENDING · GENERATING · READY · FAILED

* **Fase 1** — MVP
  + [x] Dominio
    - [x] `Order` con dos enums
    - [x] `OrderItem` VO
    - [x] Invariantes: total inmutable (readonly), Orden ≥ 1 item, quantity > 0
    - [x] Máquina de estados en métodos del agregado
  + [x] Aplicación
    - [x] `CreateOrder` idempotencyKey - reserva stock, emite `order.created`
    - [x] `GetOrderDetail`
    - [x] `GetOrdersByUser`
  + [x] Infraestructura
    - [x] `TypeOrmOrderRepository`
    - [x] `OrderIdGenerator` (Redis `INCR` + fallback timestamp)
    - [x] `OrderFinderAdapter`
    - [x] `OrderPaymentStatusAdapter`
  + [x] Presentación
    - [x] `POST /orders`
    - [x] `GET /orders/:id`
    - [x] `GET /orders` (mías)
  + [x] Listeners
    - [x] `PaymentLinkCreatedListener` → attach URL + `waiting_payment` 
    - [x] `OrderPaidListener` → `pay()` + `confirmReservation` 
    - [x] `OrderPaymentFailedListener` → `releaseReservation` + `fail()` 
  + [ ] Bugs a arreglar
    - [x] `pay()` idempotente
    - [x] `fail()` idempotente
    - [x] `confirmReservation` idempotente
    - [x] `releaseReservation` idempotente
    - [x] Invertir orden en `OrderPaidListener` (stock primero)
    - [ ] Fix 202 infinito (terminal statuses)
    - [ ] `@ArrayMinSize(1)` en DTO
    - [ ] Índice en `orders.userId`
    - [ ] `preload` silencioso → throw si no existe
    - [ ] Borrar `aggregateRoot.ts`
    - [ ] `statusMap` en mapper → cast directo + validación

* **Fase 2** — Resiliencia + consistencia
  + [ ] `TRANSITIONS` centralizado (`canTransition()`)
  + [ ] `CancelOrderUseCase` + endpoint `POST /orders/:id/cancel`
  + [ ] Compensación desde `PAID → CANCELLED` (release + refund stub)
  + [ ] `OrderReconciliationService` (cron)
  + [ ] `findPaidWithUnconfirmedStock(limit)`
  + [ ] `findFailedWithReservedStock(limit)`
  + [ ] `@nestjs/schedule` para el cron

* **Fase 3** — Observabilidad
  + [ ] `event` estructurado en logs
  + [ ] Contador `orders_created_total`
  + [ ] Logs con `orderId` en cada transición

* **Fase 5** — Estados extendidos
  + [ ] `SHIPPED` / `DELIVERED` en `OrderStatus`
  + [ ] `ship()` / `deliver()`
  + [ ] `TRANSITIONS` actualizado
  + [ ] Decisión: ¿`COMPLETED` se elimina? (recomendado: sí)

* **Backlog (post-v5)** 
  + [ ] `FAILED → PENDING` (retry con nuevo intento)
  + [ ] Historial de transiciones (`order_status_history`)
  + [ ] Webhook de shipping para tracking

* **Dependencias** 
  + Ordering → Identity (guards)
  + Ordering → Catalog (`ProductFinderPort``StockPort`)
  + Ordering → Cart (checkout)
  + Payment ← Ordering (eventos: `order.created``order.paid`)

### Dominio

* `Order` (id, userId, idempotencyKey, items[], total, status, reservationId, paymentStatus, paymentUrl)
* `OrderStatus` enum:
* - PENDING          — orden creada, esperando link de pago
* - WAITING_PAYMENT  — link generado, esperando pago del usuario
* - PAID             — pago confirmado
* - COMPLETED        — proceso terminado
* - FAILED           — pago falló o no se pudo generar el link
* - CANCELLED        — cancelada manualmente
* `PaymentStatus` enum (separado, ortogonal):
* - PENDING     — sin link aún
* - GENERATING  — link en generación
* - READY       — link listo y publicado
* - FAILED      — generación del link falló
* Transiciones de `OrderStatus` **(las que ya existen en el código):
* PENDING          → WAITING_PAYMENT | PAID | FAILED | CANCELLED
* WAITING_PAYMENT  → PAID | FAILED
* PAID             → COMPLETED
* COMPLETED        → (terminal)
* FAILED           → (terminal)
* CANCELLED        → (terminal)

### Métodos reales en `Order` 

| Método | Transición que hace |
|---|---|
| `pay()` | `PENDING` or `WAITING_PAYMENT` → `PAID` (+ paymentStatus READY) |
| `waiting_payment()` | `PENDING` → `WAITING_PAYMENT` |
| `fail()` | `PENDING` or `WAITING_PAYMENT` → `FAILED` |
| `completeOrder()` | `PAID` → `COMPLETED` |
| `cancelOrder()` | cualquiera excepto COMPLETED/CANCELLED → `CANCELLED` |
| `setPaymentUrl(url)` | solo si `PENDING` y no hay URL |
| `markPaymentGenerating()` | `paymentStatus PENDING` → `GENERATING` |
| `markPaymentReady()` | → `READY` (idempotente) |
| `markPaymentFailed()` | → `FAILED` (con guard) |

### Listeners reales

| Listener | Qué hace |
|---|---|
| `OrderCreatedListener` (payment) | `markGenerating` → genera link → emite `PAYMENT_LINK_CREATED` |
| `PaymentLinkCreatedListener` (order) | `setPaymentUrl` + `waiting_payment` + `markPaymentReady` |
| `OrderPaidListener` (order) | `pay()` + `confirmReservation` |
| `OrderPaymentFailedListener` (order) | `releaseReservation` + `fail()` |

---
---
---
---
---
---
---
---
---
---
 

## 3. Reconciliación: notas vs código

| Nota dice | Código tiene | Resolución |
|---|---|---|
| `PENDING → PAID` | ✅ | OK |
| `PENDING → FAILED` | ✅ | OK |
| `PENDING → CANCELLED` | ✅ | OK |
| `PAID → SHIPPED → DELIVERED` | ❌ no existe | **Fase 5** |
| `PAID → CANCELLED` (con compensación) | ⚠️ `cancelOrder()` permite pero**no compensa**| **Fase 2** : agregar compensación |
| `PAID → FAILED` | ❌ no existe (ni debe) | Descartar: si ya está PAID, no puede fallar |
| `FAILED → PENDING` (retry) | ❌ no existe | **Backlog** (coherente con "MVP: FAILED terminal") |
| `COMPLETED` terminal | ✅ existe, y `cancelOrder` lo respeta | OK |
| `WAITING_PAYMENT` | ✅ existe en código, ❌ no en notas | **Agregar a las notas** (es válido) |
| `paymentStatus` | ✅ existe en código, ❌ no en notas | **Agregar a las notas** (es un acierto) |
| Transiciones centralizadas en `canTransition()` | ❌ no existe | **Fase 2** |

---

### Deudas del MVP actual (bugs a arreglar antes de cerrar Fase 1)

| Bug | Archivo | Fix |
|---|---|---|
| `pay()` no idempotente | `order.entity.ts` | Si `status === PAID` , return (no throw) |
| `fail()` no idempotente | `order.entity.ts` | Si `status === FAILED` , return |
| `confirmReservation` no idempotente | `stock-reservation.adapter.ts` | Si ya CONFIRMED, return |
| `releaseReservation` no idempotente | `stock-reservation.adapter.ts` | Si ya RELEASED, return |
| Listeners con `emit()` (fire-forget) | `handle-webhook.use-case.ts` | Cambiar a `emitAsync()` |
| `OrderPaidListener` puede quedar inconsistente | `order-paid.listener.ts` | Reorder: stock primero |
| `cancelOrder()` no compensa | `order.entity.ts` + use case | Si cancela desde PAID → liberar reserva |

 **Exit criteria** : doble submit del mismo `idempotencyKey` devuelve la misma orden. Doble webhook `ORDER_PAID` no rompe. Apagar Postgres entre reserva y creación → la reserva queda RELEASED.

---

## FASE 2 — Resiliencia y consistencia

 **Objetivo**: que el sistema converja a un estado consistente **sin importar qué falle ni cuándo** .

### Dominio

 **Centralizar transiciones** (el `canTransition()` de tus notas):

```ts
private static readonly TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:         ['WAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'],
  WAITING_PAYMENT: ['PAID', 'FAILED'],
  PAID:            ['COMPLETED', 'CANCELLED'],
  COMPLETED:       [],
  FAILED:          [],
  CANCELLED:       [],
};
```

Todos los métodos ( `pay` , `fail` , `waiting_payment` , `cancelOrder` , `completeOrder` ) pasan a delegar a un único `transitionTo(next)` que valida contra `TRANSITIONS` .

 **Compensación desde `PAID → CANCELLED` ** :
* Requiere liberar reserva de stock
* Requiere refund (stub en MVP)
* Nuevo use case: `CancelOrderUseCase`

### Aplicación

* `CancelOrder` — con compensación (release stock + refund stub)
* `OrderReconciliationService` — cron que busca órdenes en estado inconsistente

### Infraestructura

* `OrderRepository.findPaidWithUnconfirmedStock(limit)`
* `OrderRepository.findFailedWithReservedStock(limit)`
* `infra/resilience/` compartido con Payment (timeout, retry, breaker)

### Presentación

* `POST /orders/:id/cancel`

### Garantías

* Los listeners son **idempotentes** (arreglados en Fase 1)
* El cron reconcilia en ≤ 1 min cualquier estado huérfano
* Si el pago falla, la reserva se libera **siempre** (idempotente + reconciliación)

 **Exit criteria** : apagar el proveedor de pago por 5 min → todas las órdenes terminan en `FAILED` con stock liberado. Simular crash del proceso entre `pay()` y `confirmReservation` → el cron lo detecta y lo arregla.

---

## FASE 5 — Estados extendidos (Shipping)

 **Objetivo** : modelar el ciclo de vida físico del pedido.

### Dominio

 **Agregar al enum** :

```
SHIPPED    — despachado al carrier
DELIVERED  — entregado al cliente
```

 **Actualizar `TRANSITIONS` ** :

```
PAID     → COMPLETED | SHIPPED | CANCELLED
SHIPPED  → DELIVERED
DELIVERED → (terminal)
```

 **Nuevos métodos** :
* `ship()` — solo desde `PAID`
* `deliver()` — solo desde `SHIPPED`

 **Nota** : `COMPLETED` y `SHIPPED` conviven. `COMPLETED` significa "listo para despacho" (proceso interno), `SHIPPED` significa "en tránsito". Si el negocio no los distingue, `COMPLETED` se puede eliminar en esta fase y quedar `PAID → SHIPPED → DELIVERED` directo.

### Integración

* Shipping BC emite `shipment.dispatched` y `shipment.delivered`
* `Order` escucha esos eventos y transiciona

 **Exit criteria** : crear orden → pagar → despachar → entregar. El estado refleja cada paso.

---

## Backlog (post-v5)

* `FAILED → PENDING` (retry de pago con nuevo intento)
* Máquina de estados en tabla de transiciones persistida (auditable)
* Historial de transiciones de cada orden (`order_status_history`)
* Webhook de shipping que actualiza tracking

---

## 5. Decisiones pendientes (hay que tomarlas ahora)

### D1. ¿ `COMPLETED` y `SHIPPED` coexisten o `COMPLETED` se elimina en Fase 5?

* **Opción A** : ambos existen. `PAID → COMPLETED → SHIPPED → DELIVERED`.
* **Opción B** : `COMPLETED` se elimina cuando llega `SHIPPED`. Queda `PAID → SHIPPED → DELIVERED`.

 **Recomendación**: **B** . `COMPLETED` es un estado ambiguo ("¿completado significa entregado o despachado?"). Tu código actual lo tiene como "listo para despacho" pero las notas lo usan como "proceso terminado". Ambiguo. Mejor eliminarlo cuando llegue Shipping y dejar que `SHIPPED` / `DELIVERED` cuenten la historia.

### D2. ¿ `PAID → FAILED` es válido?

Tus notas dicen que sí. El código dice que no (y hace bien). **Recomendación**: **no es válido** . Si ya está `PAID` , no puede fallar. Lo que puede pasar es `PAID → CANCELLED` (con compensación). Corregir la nota.

### D3. ¿ `WAITING_PAYMENT` queda en el modelo?

* **A favor** : modela un estado intermedio real (link generado, esperando pago).
* **En contra** : agrega complejidad. `PENDING` podría cubrir ambos ("orden creada, pago no confirmado").

 **Recomendación**: **queda** . Es útil porque permite consultar "órdenes que ya tienen link pero no se pagaron" (abandoned carts). Si lo eliminas, perdés esa query.

---

## 6. Diferencias con las notas originales

| Punto | Nota original | Reconciliación |
|---|---|---|
| Una sola máquina de estados | Asumido | **Dos máquinas** (Order + Payment) |
| `PAID → FAILED` | Permitido | **No permitido** en código, correcto así |
| `COMPLETED` | Presente, ambiguo | Ambiguo, se elimina en Fase 5 |
| `WAITING_PAYMENT` | Ausente | **Existe en código** , se documenta |
| `paymentStatus` | Ausente | **Existe en código** , es un acierto |
| `FAILED → PENDING` | Opcional | **Backlog** (post-v5) |
| Estados centralizados | Idea del `canTransition()` | **Fase 2** |

---

## 7. Lo que hay que arreglar en el código (ordenado por prioridad)

| # | Fix | Archivo | Fase |
|---|---|---|---|
| 1 | `pay()` idempotente | `order.entity.ts` | 1 |
| 2 | `fail()` idempotente | `order.entity.ts` | 1 |
| 3 | `confirmReservation` idempotente | `stock-reservation.adapter.ts` | 1 |
| 4 | `releaseReservation` idempotente | `stock-reservation.adapter.ts` | 1 |
| 5 | `emitAsync` en webhooks | `handle-webhook.use-case.ts` | 1 |
| 6 | Reorder en `OrderPaidListener` | `order-paid.listener.ts` | 1 |
| 7 | `cancelOrder` con compensación | `order.entity.ts` + use case | 2 |
| 8 | `TRANSITIONS` centralizadas | `order.entity.ts` | 2 |
| 9 | `OrderReconciliationService` | nuevo | 2 |
| 10 | `findPaidWithUnconfirmedStock` | `order.repository.ts` | 2 |
| 11 | Estados `SHIPPED` / `DELIVERED` | `orderStatus.enum.ts` | 5 |
| 12 | `ship()` / `deliver()` | `order.entity.ts` | 5 |
