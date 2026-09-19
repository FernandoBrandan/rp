# Cart — ordenado por fases

## Decisión de diseño (aplica a todas las fases)

**Cart es el BC con menos necesidad de consistencia fuerte. Necesita cache.**

Propiedades que lo justifican:

- **Reconstruible**: si se pierde, el usuario lo vuelve a armar
- **No crítico**: no bloquea al negocio si falla 1 minuto
- **Por usuario**: clave natural (`userId`), fácil de invalidar
- **Alta frecuencia de lectura**: se abre muchas más veces de las que se modifica

**Consecuencia para la spec**: Redis no se usa como "cache sobre DB" (patrón común), sino como **fuente primaria con DB como respaldo**. Ese es el uso correcto de cache para este dominio.

---

## ⚠️ Decisión pendiente: forma de los endpoints

Hay dos formas posibles y no son compatibles:

**A. Actual (sin Identity)**: `userId` en el path

```
GET    /cart/:userId
POST   /cart/:userId
PUT    /cart/:userId
DELETE /cart/:userId/:productId
```

**B. Objetivo (con Identity)**: `userId` viene del JWT

```
GET    /cart
POST   /cart/items
PUT    /cart/items/:productId
DELETE /cart/items/:productId
```

**Recomendación**: migrar a **B** cuando Identity entre en Fase 1. Mientras tanto, **A** funciona para testear. La lógica de dominio y aplicación no cambia entre una y otra — solo el controller.

**Regla**: `userId` **nunca** debe venir del cliente cuando hay auth. Es la fuente #1 de bugs de seguridad (ver un carrito ajeno).

---

## MVP (Fase 1)

**Objetivo**: usuario agrega/quita productos, actualiza cantidades, y ve su carrito. Persistencia en DB. Validación contra Catalog al agregar.

### Dominio

- `Cart` (userId, items[])
- `CartItem` como Value Object (productId, quantity)
- `CartRepository` (interface)

**Invariantes**:

- `quantity > 0` y entero
- No duplicados: agregar el mismo `productId` **suma** cantidad, no duplica item
- `removeItem` falla si el item no existe
- `updateQuantity` falla si el item no existe

### Aplicación

- `AddToCart` — valida producto contra Catalog (existe, ACTIVE, stock suficiente para la cantidad actual)
- `RemoveFromCart`
- `UpdateQuantity`
- `GetCart` — enriquece items con nombre + precio del Catalog

### Infraestructura

- Implementación de `CartRepository` (TypeORM)
- Tabla `carts` con `items` en JSON
- Puerto `ProductCheckerPort` hacia Catalog

### Presentación

- `GET /cart`
- `POST /cart/items`
- `PUT /cart/items/:productId`
- `DELETE /cart/items/:productId`

Todos protegidos con `JwtAuthGuard`. El `userId` sale del token.

### Seguridad

- DTOs validados (`AddToCartDTO`, `UpdateQuantityDTO`)
- `userId` **nunca** viene del body ni del path — siempre del JWT

**Exit criteria**: usuario agrega producto, lo ve en `GET /cart`, actualiza cantidad, lo borra. Si intenta agregar producto inexistente → 404. Si intenta cantidad mayor al stock → 400.

---

## v2 (Fase 2 · Resiliencia · o Fase 3 · Observabilidad)

**Objetivo**: preparar el BC para lectura bajo carga. Cache de lectura sobre Redis (DB sigue siendo fuente de verdad).

### Aplicación

- `GetCart` consulta Redis primero, fallback a DB
- Al modificar (`Add`/`Remove`/`Update`), invalidar entrada de Redis

### Infraestructura

- `CartCacheService` sobre Redis
- Clave: `cart:{userId}`
- TTL corto (5 min) como red de seguridad
- **Invalidación explícita** en cada write

### Presentación

- Sin cambios en la API pública (transparencia de infra)

**Exit criteria**: `GET /cart` con cache hit < 30ms. Los writes invalidan correctamente. La DB sigue siendo la fuente de verdad.

---

## v3 (Fase 4 · Performance)

**Objetivo**: Redis como fuente primaria, DB como respaldo. El caso de uso real de cache.

### Aplicación

- `AddToCart` / `RemoveFromCart` / `UpdateQuantity` **escriben primero en Redis** y **luego** en DB (write-through)
- `GetCart` lee **solo de Redis** en el camino caliente
- Un job de reconciliación sincroniza Redis → DB periódicamente (o on-write, según tolerancia)

### Infraestructura

- Redis con persistencia (AOF) — no es "cache volátil", es "store primario"
- DB recibe escritura diferida para durabilidad
- Si Redis cae: `GetCart` cae a DB (degradación elegante)

### Trade-off documentado

- **A favor**: latencia de lectura ~1ms, no toca DB en el 99% de los requests
- **En contra**: complejidad de consistencia Redis ↔ DB. Si Redis se pierde antes de sincronizar, el carrito puede quedar stale (aceptable porque el carrito es reconstruible)

**Exit criteria**: `GET /cart` p95 < 10ms con 1000 RPS. Matar Redis no rompe la experiencia (fallback a DB funciona).

---

## v4 / Backlog

Solo si el negocio lo pide.

- Merge de carrito anónimo → logueado (cuando el usuario se registra, migrar items del carrito temporal)
- Expiración automática de carritos abandonados (job)
- Guardar carrito como "wishlist" o "guardado para después"
- Cupones / descuentos aplicados al carrito
- Validación de precio al checkout (evitar stale pricing — el carrito guarda precio viejo, la orden debe usar precio actual)
- Límite de items por carrito (ej. máx 50 productos)
- Notificación si un producto del carrito cambia de precio o se queda sin stock

---

## Reglas del BC

| Regla                                                          | Por qué                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `userId` siempre del JWT, nunca del cliente                    | Seguridad — evita ver/modificar carrito ajeno             |
| Validar contra Catalog **al agregar**, no al mostrar           | Evita llenar el carrito de basura                         |
| `GetCart` puede devolver items "rotos" (producto ya no existe) | El carrito es histórico; se filtran o marcan al mostrar   |
| El carrito **no** reserva stock                                | Reserva es responsabilidad de Inventory al hacer checkout |
| Un solo carrito activo por usuario                             | Sin multi-carrito en MVP                                  |
| `Cart` no conoce `Order`                                       | El carrito es pre-orden; no genera órdenes                |

---

## Estructura de archivos objetivo

```
src/modules/02cart/
├── application/
│   ├── dto/
│   │   ├── request/         add-to-cart, update-quantity
│   │   └── response/        cart.response
│   ├── mappers/             cart.mapper
│   ├── ports/               product-checker.port (hacia Catalog)
│   └── use-cases/           add-to-cart, remove-from-cart, update-quantity, get-cart
├── domain/
│   ├── value-objects/       cartItem.vo
│   ├── cart.entity.ts
│   └── repositories/        cart.repository
├── infra/
│   ├── cache/               cart-cache.service (v2+)
│   ├── persistence/         cart.orm-entity, cart.orm.mapper
│   └── repositories/        typeorm-cart.repository
├── presentation/
│   └── cart.controller.ts
└── cart.module.ts
```

**MVP** construye: dominio, 4 use cases, repo TypeORM, controller con guards, puerto hacia Catalog.
**v2** agrega: `CartCacheService`, invalidación en writes.
**v3** agrega: Redis como primario, write-through, fallback a DB.

---

## Dependencias entre BCs

| Depende de | Para qué                                       | Dirección                                 |
| ---------- | ---------------------------------------------- | ----------------------------------------- |
| Identity   | `JwtAuthGuard`, `@CurrentUser()` para `userId` | Cart → Identity                           |
| Catalog    | Validar existencia, estado y stock al agregar  | Cart → Catalog (vía `ProductCheckerPort`) |
| —          | Ordering consume Cart al hacer checkout        | Ordering → Cart (vía puerto o endpoint)   |

**Nota**: hoy `CartModule` importa `CatalogModule` directamente para obtener `ProductCheckerAdapter`. La forma correcta es exponer un puerto desde Cart (`ProductCheckerPort`) e implementar el adapter en Catalog (como ya está), pero **el token debe vivir en `common/` o en Cart**, no en Catalog. Si está en Catalog, el acoplamiento es al revés.

---

## Sobre el código actual

Tres cosas a ajustar cuando migres:

1. **Endpoints**: pasar de `/cart/:userId` a `/cart/items` cuando Identity entre en Fase 1.
2. **`GetCartUseCase` hace N+1**: por cada item, una query a Catalog. En v2 se resuelve con `ProductFinderPort.findByIds()` (bulk).
3. **Falta validación de stock al actualizar cantidad**: hoy `UpdateQuantityUseCase` valida contra Catalog, pero solo verifica `product.stock >= quantity`. Correcto, pero revisar que si el producto cambia de estado a `INACTIVE` después de estar en el carrito, se maneje el caso.

---

¿Seguimos con **Ordering** (que es el más complejo: estados, idempotencia, compensación) o preferís **Inventory** primero, que es más corto y Ordering lo consume?
