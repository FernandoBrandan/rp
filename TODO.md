# Lista de tareas pendientes — estado actualizado

## 🔴 Bugs / inconsistencias que quedan

1. **`paymentStatus` sigue en `PENDING` para siempre**
   Nadie lo setea a `GENERATING`, `READY` o `FAILED` en el flujo. El campo existe, persiste, se mapea... pero es decorativo. Decisión: cablearlo (3 puntos de cambio) o revertirlo para no dejar deuda fantasma.

2. **Comentarios de rutas viejas en adapters**
   Los headers de estos archivos apuntan a paths que ya no existen:
   - `catalog/infra/adapters/product-checker.adapter.ts` → dice `.service.ts`
   - `catalog/infra/adapters/product-finder.adapter.ts` → dice `.service.ts`
   - `catalog/infra/adapters/stock-reservation.adapter.ts` → dice `stock-validate.service.ts`
   - `order/infra/adapters/order-finder.adapter.ts` → dice `.service.ts`

3. **`'payment.approved'` string literal**
   Ya desapareció con el refactor del `FakePaymentProvider` (ahora emite `ORDER_PAID` directo). ✅ Verificar con grep que no quedó rastro.

---

## 🟢 Quick wins

4. **Swagger completo**
   - `@ApiTags('products')` / `'cart'` / `'orders'` / `'payments'` / `'health'` en cada controller
   - `@ApiOperation({ summary })` en cada endpoint
   - `@ApiResponse({ status, description })` en los casos importantes (200, 400, 404, 503)

5. **Comentarios en `database.module.ts`**
   Documentar:
   - `autoLoadEntities: true` → carga entidades de `forFeature()`
   - `synchronize: true` → ⚠️ **solo dev, nunca prod**
   - `logging: true` → imprime queries
   - Considerar mover estos a env vars (`DB_SYNC`, `DB_LOG`)

6. **Verificar cleanup de Bull**
   ```bash
   rg "bull" package.json
   rg "@nestjs/bull" src/
   ```
   Si no hay resultados en `src/`, sacar del `package.json`.

7. **Borrar carpeta `04payments/domain/`** si quedó vacía (era `rmdir`).

---

## 🟡 Suscriptores de eventos (de tus notas)

8. **`CartSubscriber`** (más simple, mejor punto de entrada)
   - Ubicación: `02cart/application/listeners/order-paid.listener.ts`
   - Escucha `ORDER_PAID` → `cartRepository.clear(order.userId)`
   - Necesita `ORDER_FINDER` inyectado en `CartModule` (agregar `OrderModule` a imports... ojo con dependencia circular: `OrderModule` ya importa `CatalogModule`, `CartModule` importa `CatalogModule`. Si `CartModule` importa `OrderModule` y `OrderModule` no importa `CartModule`, no hay ciclo).
   - Eventual: si falla, `logger.warn` y no romper el pago

9. **`NotificationSubscriber`** (versión log-only primero)
   - Ubicación: `03order/application/listeners/` o módulo nuevo `05notifications`
   - Escucha `ORDER_CREATED` → log "pendiente de pago"
   - Escucha `ORDER_PAID` → log "gracias por la compra"
   - Después: `NotificationPort` + adaptador (SendGrid/SES)

10. **`InventorySubscriber`** — probablemente **no hacer**
    - Hoy `OrderPaidListener` de order ya confirma stock vía `StockPort`
    - Moverlo a catalog desacopla, pero agrega una capa
    - Hacer solo si stock crece (múltiples almacenes, expiraciones, reglas propias)

---

## 🔵 Integración real

11. **Implementar `MercadoPagoProvider`**
    - SDK `mercadopago` o HTTP directo a su API
    - Leer `MERCADOPAGO_ACCESS_TOKEN` de `ConfigService`
    - Mapear respuesta → `{ url: string }`
    - Manejar errores → `InfrastructureException`
    - El switch ya está en `payment.module.ts` (`PAYMENT_PROVIDER=mercadopago`)

12. **Decidir sobre Bull** — y si vas, hacerlo bien
    - Hoy: cero Bull, cero processor, cero queue. Bien.
    - Cuándo sí:
      - Sobrevivir crash entre `emit(ORDER_CREATED)` y respuesta del provider
      - Reintentos con backoff ante fallos del provider
      - Múltiples instancias con un solo worker por job
    - Si vas: `jobId: payment-link:${orderId}` para dedupe (Bull sin `jobId` **genera duplicados**)

---

## 🟠 Deuda técnica opcional

13. **`Product` y `Cart` no usan `updateX` en los use-cases**
    `UpdateProductUseCase` hace `product.name = ...` directo en vez de métodos del dominio. Funciona, pero rompe encapsulamiento. No es urgente.

14. **`CartItem` VO es mutable**
    `existing.quantity += item.quantity` dentro de `Cart.addItem`. Los VOs deberían ser inmutables. Refactor no urgente.

15. **`Money` duplicado**
    Existen `catalog/domain/value-objects/money.vo.ts` y `order/domain/value-objects/money.vo.ts`. Son distintos (order tiene `add` y `multiply`). Mover a `common/domain/` cuando duela.

16. **`ProductStatus` es enum en `value-objects/`**
    Convención: los `value-objects/` contienen clases VO, no enums. Mover a `domain/enums/` o dejarlo como está. Cosmético.

17. **`Order.create` recibe `total` calculado, pero `IOrder` exige `total`**
    Ya está bien con `CreateOrderProps`. Solo chequear que no haya quedado otro call-site.

---

## ⚫ Backlog / no hacer todavía

18. **`StockReservation` como agregado de dominio** — no hacer. Over-engineering hasta que la reserva tenga reglas propias.

19. **Mover lógica de stock de `OrderPaidListener` a un subscriber de catalog** — depende del punto 10.

20. **Test suite** — no hay tests. Cuando el flujo esté estable, agregar e2e del happy path y del path de fallo del provider.

---

## Orden sugerido

```
Sprint 1 — cerrar prolijidad:
  1. Decidir paymentStatus (cablear o revertir)
  2. Limpiar comentarios de rutas viejas en adapters
  3. Verificar cleanup de Bull
  4. Borrar 04payments/domain si quedó
  5. Swagger completo
  6. Comentarios en database.module.ts

Sprint 2 — event-driven:
  7. CartSubscriber
  8. NotificationSubscriber (log-only)
  9. Evaluar InventorySubscriber (probablemente no)

Sprint 3 — integración real:
  10. MercadoPagoProvider real
  11. Cablear paymentStatus end-to-end
  12. Bull si se justifica
  13. Tests e2e
```

---

## Resumen ultra corto

| Prioridad | Ítem |
|---|---|
| 🟡 | Cablear o revertir `paymentStatus` |
| 🟢 | Limpiar comentarios de rutas viejas en 4 adapters |
| 🟢 | Verificar Bull fuera del `package.json` |
| 🟢 | Swagger `@ApiTags` + `@ApiOperation` |
| 🟢 | Comentarios en `database.module.ts` |
| 🟡 | `CartSubscriber` (vaciar carrito en `ORDER_PAID`) |
| 🟡 | `NotificationSubscriber` (log-only) |
| 🔵 | `MercadoPagoProvider` real |
| 🔵 | Bull (solo si se justifica) |
| ⚫ | Tests e2e |
| ❌ | StockReservation como agregado, mover Inventory a catalog |