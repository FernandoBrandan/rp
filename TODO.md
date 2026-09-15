# Ver

- Falta ProductsController que use PRODUCT_FINDER directo (solo se usa vía puerto de Order).

- Los @OnEvent no son transaccionales:
- - si OrderPaidListener falla a medias (pay() ok, confirmReservation() falla) queda inconsistente.
- - Considera outbox pattern.

### 🟡 Suscriptores de eventos (los de tu nota)

11. **`CartSubscriber`** (más simple, mejor punto de entrada)
    - Escucha `OrderPaid` → `cartRepository.clear(userId)`
    - Necesita `ORDER_FINDER` para leer el `userId` desde la orden
    - Eventual: si falla, log `warn` y no rompe el pago
    - Ubicación: `02cart/application/listeners/order-paid.listener.ts`
    - Registrar en `CartModule`

12. **`NotificationSubscriber`** (versión log-only)
    - Escucha `OrderCreated` → `logger.info('Notificación: orden pendiente de pago')`
    - Escucha `OrderPaid` → `logger.info('Notificación: gracias por tu compra')`
    - Ubicación: `04notifications/` (módulo nuevo) o dentro de `03order/application/listeners/`
    - Para MVP: solo log. Después: `NotificationPort` + adaptador SendGrid/SES.

13. **`InventorySubscriber`** — evaluar si vale la pena separarlo
    - Hoy `OrderPaidListener` de order ya confirma stock vía `StockPort`
    - Mover la responsabilidad a catalog **desacopla order de stock**, pero agrega un salto extra
    - **Decisión recomendada**: dejarlo como está. Es un refactor de gusto, no de correctitud. Si en algún momento `stock` crece (múltiples almacenes, expiraciones), ahí se separa.

---

### 🔵 Integración real

14. **Implementar `MercadoPagoProvider`**
    - `generatePaymentLink` real (SDK `mercadopago` o HTTP contra su API)
    - Env: `MERCADOPAGO_ACCESS_TOKEN` vía `ConfigService`
    - En `payment.module.ts` ya tenés el switch por `PAYMENT_PROVIDER`, solo tenés que setear la env
    - Manejo de errores: mapear a `InfrastructureException`

---

# ⚫ Backlog

- Tests e2e — happy path, fallo del provider, concurrencia por idempotencyKey.
- InventorySubscriber — solo si stock crece.
