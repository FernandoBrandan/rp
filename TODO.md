# Primario - Cambios estructurales - FASE 2

```ts
export interface IProduct {
  id: string;
  serial: Serial; MODIFICAR SKU: SKU;
  name: string;
  description: string; AGREGAR
  categories: string; AGREGAR
  metadata: string; AGREGAR
  price: Money; MODIFICAR salePrice: Money;
  stock: number; ELIMINAR
  status: ProductStatus;
}
```

- Usecase
- - validad si existe producto
- - No existe: emitir evento de stock `quisieron comprar`
- - Dejar el producto innactivo hasta reestockear
- - En invetary si repone stock emitir evento a catalogo `activar`

- Modulo inventario: Main
  InventoryItem - ejemplo
  ├── id
  ├── productId - validar en catalog
  ├── stock - total
  ├── available - total - reserved ??
  ├── reserved
  ├── minimumStock
  ├── purchasePrice

- Modulo inventario: Registra movimientos
  StockMovement
  ├── productId - validar en catalog
  ├── quantity
  ├── type = PURCHASE
  ├── referenceId = purchaseOrderId
  └── createdAt

# Ver

- Los @OnEvent no son transaccionales:
- - si OrderPaidListener falla a medias (pay() ok, confirmReservation() falla) queda inconsistente.
- - Considera outbox pattern.

## Agregar a todos los orm entity

@CreateDateColumn()
createdAt: Date;

@UpdateDateColumn()
updatedAt: Date;

# CI gitactions tiro error ver despues -> ver quehacer con los warning

- opcion : ingnorar lint

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

# Dominios separados

Hay una violación sutil: StockReservationEntity + StockReservationAdapter viven en 01catalog, pero conceptualmente son de Inventory.
Hoy funciona, pero:

- El requerimiento lista Inventory como BC propio
- La tabla stock_reservations no debería estar en el módulo Catalog
- Si mañana otro módulo necesita reservar stock (¿Shipping? ¿un admin?), importaría desde Catalog

Por eso propuse extraerlo a 05inventory. No es urgente, pero es la deuda técnica más clara que tenés.

# Tabla de transiciones:

```ts
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['WAITING_PAYMENT', 'PAID', 'FAILED', 'CANCELLED'],
  WAITING_PAYMENT: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};
```

## 3. Invariantes protegidas — ❓ (aclaro)

### Qué significa

Una **invariante** es una regla de negocio que **siempre debe cumplirse**, sin importar qué camino tome el código. No es validación de input — es validación de **estado del dominio**.

Ejemplos:

- "El total de una orden es inmutable una vez creada"
- "El stock nunca puede ser negativo"
- "Una orden no puede pasar de `FAILED` a `PAID` sin nuevo intento"
- "Una orden debe tener al menos 1 item"

### Tu estado — acá estás **regular**

**Invariantes que SÍ protegés**:

| Invariante                | Dónde                                             | ✅/❌           |
| ------------------------- | ------------------------------------------------- | --------------- |
| Monto no negativo         | `Money` constructor                               | ✅              |
| Stock no negativo         | `Product.updateStock()` valida `stock < 0`        | ✅ (en memoria) |
| Cantidad positiva         | `CartItem`, `OrderItem` constructores             | ✅              |
| Orden con al menos 1 item | `Order.create()`                                  | ✅              |
| Precio autoritativo       | `CreateOrderUseCase` reemplaza precio del cliente | ✅              |
| Total inmutable           | El `total` es readonly en `Order`                 | ✅              |
| Transiciones válidas      | Métodos de `Order` validan                        | ⚠️ parcial      |

**Invariantes que NO protegés** (¡ojo acá!):

| Invariante                                              | Problema                                                                                                                                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Stock nunca negativo"**                              | Solo se valida en memoria y en la query `WHERE stock >= :qty`. Pero si dos transacciones concurrentes pasan el chequeo antes del decremento, ambas pueden restar → **race condition** |
| **"El total es inmutable"**                             | El campo es `readonly` pero el **mapper de persistencia** puede sobrescribirlo. Y si `Order.pay()` tocara items, se rompería                                                          |
| **"FAILED no puede ir a PAID"**                         | `pay()` valida estado pero... ¿qué pasa si alguien llama `order.status = 'PAID'` directo? En TypeScript no podés evitar eso, pero podés hacer `status` privado con getter             |
| **"Una reserva no puede tener stock negativo"**         | `releaseReservation` suma stock sin re-verificar el techo máximo                                                                                                                      |
| **"Una orden cancelada no puede tener reserva activa"** | No lo valida nadie                                                                                                                                                                    |
| **"Cada producto en una orden es único"**               | No lo validás — podés crear orden con `[{A, 2}, {A, 3}]`                                                                                                                              |

### Ejemplo concreto del bug de stock

```ts
// Transacción 1: lee stock = 1
const product = await repo.findById(id); // stock = 1
if (product.stock >= 1) {
  // ✓ pasa
  // ... entre medio, transacción 2 también lee stock = 1
  await repo.updateStock(product.stock - 1); // stock = 0
}

// Transacción 2: lee stock = 1 (antes del update de T1)
const product2 = await repo.findById(id); // stock = 1 (lectura sucia)
if (product2.stock >= 1) {
  // ✓ pasa
  await repo.updateStock(product2.stock - 1); // stock = 0, ¡vendiste 2 con stock 1!
}
```

**Solución**: usar `UPDATE products SET stock = stock - X WHERE id = Y AND stock >= X`. Si `affected === 0`, falló. **Eso ya lo hacés bien** en `StockReservationAdapter.reserveStock()`:

```ts
const result = await manager
  .createQueryBuilder()
  .update('products')
  .set({ stock: () => 'stock - :qty' })
  .where('id = :id')
  .andWhere('stock >= :qty')   // ← ⭐ acá está la protección
  .execute();
if (result.affected === 0) throw new InsufficientStockException(...);
```

✅ Ahí **sí** está protegida la invariante. El problema es que **`Product.updateStock()`** en memoria **no** tiene esa protección — si alguien lo usa para decrementar, podés romperlo.

### Qué hacer

**Regla práctica**: las invariantes críticas (stock, total, transiciones) deben estar protegidas en **al menos uno** de estos niveles:

1. **Entidad de dominio** (validación en métodos): `Product.updateStock()` no permite negativos
2. **Repositorio** (constraint en DB): `CHECK (stock >= 0)` en la tabla
3. **Query atómica** (WHERE + UPDATE): el `WHERE stock >= :qty` que ya hacés
4. **DB constraint**: `UNIQUE(idempotencyKey)` en orders

**Hoy tenés 1 y 3**, pero te faltan:

- Constraint `CHECK (stock >= 0)` en la tabla `products`
- Constraint `CHECK (quantity > 0)` en `order_items` (aunque es JSON, no aplica)
- El campo `status` de `Order` no es privado → cualquiera lo puede setear

### Veredicto

❓ **Invariantes protegidas**: las principales **sí**, pero hay huecos. Es un concepto que se refuerza con **tests** — si escribís un test que intenta `order.pay()` sobre una orden `FAILED` y esperás excepción, la invariante queda documentada y verificada.

---

# 4. Idempotencia en órdenes

cuando pay() rompe idempotencia (tu cambio reciente), un webhook duplicado devuelve 500 en el segundo intento.
Eso no es problema de idempotencia de órdenes, es de idempotencia del pago. Lo aclaro en el punto 5.

---

## 5. Retry + timeout en pagos — ⚠️ (parcial)

### Qué significa

- **Timeout**: si el proveedor externo tarda más de X ms, abortás la request (no esperás infinito).
- **Retry con backoff**: si falla, reintentás. Backoff exponencial = esperás 1s, luego 2s, luego 4s, etc.
- **Circuit breaker**: si el proveedor falla mucho, dejás de llamarlo por un rato (no saturás un servicio caído).

### Tu estado

**Timeout**: ⚠️ **parcial**

- Tu `FakePaymentProvider` tiene `delayMs` configurable, pero **no hay timeout real** que corte la operación.
- El `setTimeout` simula latencia, no timeout.

**Retry**: ❌ **no lo tenés**

- El requerimiento dice: _"Retry con backoff exponencial"_.
- Hoy, si `generatePaymentLink()` falla, se emite `ORDER_PAYMENT_FAILED` y listo. Nadie reintenta.

**Circuit breaker**: ❌ **no lo tenés**

- El requerimiento lo pide para Payment y Shipping.

**Simulación de fallos**: ❌ **no está**

- El requerimiento pide:
  - 20% probabilidad de timeout
  - 10% probabilidad de fallo aleatorio
- Tu `FakePaymentProvider` solo simula `approved | failed | pending` determinístico.

### Qué hacer

```ts
// src/infra/resilience/timeout.util.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Timeout after ${ms}ms: ${label}`)),
        ms,
      ),
    ),
  ]);
}

// src/infra/resilience/retry.util.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseMs = 1000, maxMs = 8000 },
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(baseMs * 2 ** i, maxMs);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// src/infra/resilience/circuit-breaker.ts  (versión mínima)
export class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private openedAt?: number;

  constructor(
    private readonly threshold = 5,
    private readonly resetMs = 30_000,
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openedAt! > this.resetMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
    }
  }

  getState() {
    return this.state;
  }
}
```

Y en el provider:

```ts
async generatePaymentLink(order) {
  return this.circuitBreaker.exec(() =>
    withRetry(
      () => withTimeout(
        this.doGenerate(order),
        this.timeoutMs,
        'payment.generatePaymentLink',
      ),
      { attempts: 3, baseMs: 1000 },
    ),
  );
}
```

### Veredicto

⚠️ **Retry + timeout en pagos**: la **infraestructura** está (el provider, la config), pero **la resiliencia real no**. Falta la capa de `infra/resilience/` y aplicarla.

---

## 6. Logs estructurados — ⚠️ (parcial)

### Qué significa

No logs de texto libre (`printf`) sino **JSON puro**, un objeto por línea, con campos consistentes:

```json
{
  "timestamp": "2025-01-15T10:23:45Z",
  "level": "error",
  "correlationId": "abc-123",
  "service": "orders",
  "event": "payment_failed",
  "orderId": "ord-456",
  "reason": "timeout after 3000ms"
}
```

### Tu estado

**Lo bueno**:

- ✅ Tenés `correlationId` vía `AsyncLocalStorage` — **excelente**, es lo más difícil
- ✅ Tenés `Logger` interface propia
- ✅ Tenés `LoggingInterceptor` para HTTP

**Lo malo**:

- ❌ El formato es **texto**, no JSON:
  ```ts
  const logFormat = printf(
    ({ level, message, timestamp, correlationId, ...meta }) => {
      return `[${timestamp}] [${cid}] ${level.toUpperCase()}: ${message}${metaStr}`;
    },
  );
  ```
- ❌ Falta el campo `service` (¿"orders"? ¿"catalog"?) — el requerimiento lo pide
- ❌ Falta el campo `event` estructurado (`payment_failed`) — hoy está en el texto del mensaje
- ❌ Los logs de `FakePaymentProvider` son texto, no estructura

### Qué hacer

**Cambiar el formato a JSON**:

```ts
const logFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(), // ← en vez de printf
);
```

**Agregar `service`**:

```ts
// En main.ts o vía ConfigModule
const SERVICE_NAME = process.env.SERVICE_NAME || 'ecommerce-api';

// En AppLogger
info(message, meta = {}) {
  rootLogger.info(message, { ...this.withContext(meta), service: SERVICE_NAME });
}
```

**Usar `event` como campo, no como string**:

```ts
// ❌ hoy
this.logger.info('Payment link created', { orderId });

// ✅ objetivo
this.logger.info('Payment link created', {
  event: 'payment_link_created',
  orderId,
  service: 'payments',
});
```

### El "por qué"

Logs en JSON los podés:

- **Buscar** (`grep` sobre campos, no regex sobre texto)
- **Agregar** (Loki, Datadog, CloudWatch los parsean directo)
- **Filtrar por correlationId** y reconstruir un request completo
- **Alertar** (si `event=payment_failed` y `level=error` > 10 en 5 min → alerta)

### Veredicto

⚠️ **Logs estructurados**: la **infraestructura está** (Winston + correlationId), pero el **formato no es JSON** y falta `service` y `event`.

---

## 7. Health endpoints reales — ⚠️ (parcial)

### Qué significa

Dos endpoints con **semánticas distintas**:

- **`GET /health/live`** (liveness): _"¿el proceso está vivo?"_ — responde 200 si el proceso puede responder. Si falla, Kubernetes/Docker reinicia el container. **No chequea dependencias**.
- **`GET /health/ready`** (readiness): _"¿puede atender tráfico?"_ — chequea DB, Redis, circuit breaker. Si falla, el load balancer deja de mandar requests, pero **no reinicia**.

### Tu estado

Tenés **un solo** `GET /health` que:

- Chequea DB (`SELECT 1`)
- Devuelve uptime
- No chequea Redis
- No chequea circuit breaker

Eso es un **readiness**, no un liveness. Y le falta la mitad de las checks que el requerimiento pide.

### Qué hacer

```ts
@Controller('health')
export class HealthController {
  @Get('live')
  live() {
    // Solo responde, no chequea nada más
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const checks = await Promise.allSettled([
      this.health.checkDatabase(),
      this.health.checkRedis(),
      this.health.checkCircuitBreaker('payment'),
    ]);

    const allOk = checks.every((c) => c.status === 'fulfilled');
    if (!allOk) throw new ServiceUnavailableException({/* detalles */});

    return {
      status: 'ok',
      checks: { db: 'up', redis: 'up', circuitBreaker: 'CLOSED' },
    };
  }
}
```

### Por qué dos y no uno

- Con **un solo** `/health` que chequea DB: si la DB se cae, Docker **reinicia el container** (porque el liveness falla), pero el problema no era el container, era la DB → loop de reinicios inútil.
- Con **live** (no chequea DB) + **ready** (sí chequea): la DB caída marca el container como "no listo" (deja de recibir tráfico) pero **no lo reinicia**. Cuando la DB vuelve, el container se marca listo automáticamente.

### Veredicto

⚠️ **Health endpoints reales**: tenés **uno solo** y le falta Redis + circuit breaker. Falta dividir en `live` / `ready`.

---

## 8. Docker reproducible — ❌ No

### Qué significa

Que con **un comando** (`docker compose up`) cualquier persona pueda levantar el proyecto completo: app + Postgres + Redis + (opcional Prometheus/Grafana), con las versiones correctas, sin "en mi máquina funciona".

### Tu estado

❌ **No hay nada**. Ni `Dockerfile`, ni `docker-compose.yml`, ni `.env.dev` / `.env.prod`.

Hoy dependés de:

- Postgres corriendo en `localhost:5432`
- Redis corriendo en `localhost:6379`
- Que las credenciales default (`postgres/postgres`) existan

Eso **no es reproducible**. En otra máquina, no arranca.

### Qué hacer

**`Dockerfile`** (multi-stage):

```dockerfile
# build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# runtime
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**`docker-compose.yml`**:

```yaml
services:
  app:
    build: .
    ports: ['3000:3000']
    env_file: .env.dev
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: ${DB_NAME}
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 5s
      retries: 5

  redis:
    image: redis:7-alpine
```

**`.env.dev`**:

```env
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=ecommerce
REDIS_HOST=redis
REDIS_PORT=6379
```

**Y ajustar el código**: hoy `RedisModule` tiene `host: 'localhost'` **hardcodeado**. Eso rompe en Docker. Hay que leer de `ConfigService`.

### Por qué importa

- **Reproducibilidad**: `docker compose up` en cualquier máquina
- **CI/CD**: el mismo Dockerfile se usa en deploy
- **Onboarding**: nuevo dev tarda 5 min, no 2 días
- **El requerimiento lo pide explícitamente**: "app + postgres + redis + prometheus + grafana"

### Veredicto

❌ **Docker reproducible**: **0%**. Es lo más fácil de arreglar y lo más impactante para el "se ve profesional".

---

## Tabla resumen final

| Punto                      | Estado | Qué falta                                     |
| -------------------------- | ------ | --------------------------------------------- |
| **Dominios separados**     | ✅ 90% | Extraer Inventory de Catalog                  |
| **Estados explícitos**     | ❓ 60% | +SHIPPED, +DELIVERED, transiciones faltantes  |
| **Invariantes protegidas** | ❓ 70% | +CHECK constraints, +status privado, +tests   |
| **Idempotencia órdenes**   | ✅ 95% | Nada urgente                                  |
| **Retry + timeout pagos**  | ⚠️ 40% | `infra/resilience/`, simulación 20%/10%       |
| **Logs estructurados**     | ⚠️ 60% | Formato JSON, +service, +event                |
| **Health live/ready**      | ⚠️ 50% | Dividir, +Redis check, +circuit breaker check |
| **Docker reproducible**    | ❌ 0%  | Todo                                          |

---

## Sobre tus "??" específicamente

Esos dos son **conceptos de diseño de dominio**, no features. Por eso cuesta verlos "terminados":

- **Estados explícitos** es una **decisión de modelado**: cómo representás el ciclo de vida de una orden. Se ve en el enum + los métodos de transición.
- **Invariantes protegidas** es una **decisión de defensa**: qué reglas de negocio son tan importantes que las validás en múltiples capas (entidad + repositorio + DB).

Ambos se **demuestran con tests**, no con código. Un test como:

```ts
it('should not allow paying a failed order', () => {
  const order = createOrder();
  order.fail();
  expect(() => order.pay()).toThrow('Cannot pay a failed order');
});

it('should never leave stock negative under concurrency', async () => {
  await Promise.all([reserve('product-1', 1), reserve('product-1', 1)]);
  const product = await getProduct('product-1');
  expect(product.stock).toBeGreaterThanOrEqual(0);
});
```

Esos dos tests **son** la prueba de que los estados y las invariantes están protegidos. Si escribís esos dos y pasan, tenés el ✅ en ambos.

¿Querés que arranque por alguno? Mi orden recomendado: **Docker primero** (rápido + visible) → **Health live/ready** → **Logs JSON** → **Estados + Invariantes** → **Resiliencia**.
