# Catalog — ordenado por fases

---

## Decisión de diseño (aplica a todas las fases)

**Stock vive en Catalog durante MVP. Se extrae a Inventory en v2.**

Razón: en MVP, `stock` es un campo de `Product`. Cuando la lógica de reservas empieza a doler (compensaciones, liberaciones, invariantes propias), se mueve a un BC propio.

**Consecuencia para esta spec**: acá listo solo lo que es de Catalog. Todo lo de reservas/release vive en Inventory (spec aparte).

---

## MVP (Fase 1)

**Objetivo**: un admin puede crear y actualizar productos. Cualquiera puede listar y consultar productos. El stock se controla al vender.

### Dominio

- `Product` (id, serial, name, price, stock, status)
- `Money` como Value Object (compartido en `common/`)
- `Serial` como Value Object (`PROD-XXXXXX`)
- `ProductStatus` enum: `ACTIVE` | `INACTIVE`
- `ProductRepository` (interface)

**Invariantes**:
- `price >= 0`
- `stock >= 0` (nunca negativo)
- `name` no vacío
- `serial` con formato `PROD-*`
- `Product.isActive()` / `ensureIsActive()` para validar estado antes de operaciones

### Aplicación

- `CreateProduct` — admin only
- `UpdateProduct` — admin only
- `ListProducts` — público (sin paginar todavía)
- `GetProduct` — público, por serial

### Infraestructura

- Implementación de `ProductRepository` (TypeORM)
- Tabla `products` con constraint `CHECK (stock >= 0)`

### Presentación

- `GET /products`
- `GET /products/:serial`
- `POST /products` — protegido con `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`
- `PUT /products` — protegido igual

### Seguridad

- Todos los endpoints de escritura requieren rol `ADMIN`
- Todos los DTOs validados con `class-validator` (`CreateProductDTO`, `UpdateProductDTO`)

**Exit criteria**: admin crea producto, cualquiera lo consulta por serial, un `USER` recibe 403 si intenta crear.

---

## v2 (Fase 2 · Resiliencia · o Fase 3 · Observabilidad)

**Objetivo**: preparar el catálogo para lectura bajo carga y alinear con el BC de Inventory.

### Dominio

- Mover `stock` de `Product` a un BC separado (`Inventory`). Catalog queda con metadata + precio + status.
- `Product` pierde `stock` como campo propio, gana método `hasStockFor(qty)` que consulta al puerto de Inventory.

### Aplicación

- `ListProducts` gana paginación: `?page=1&limit=20`
- Nuevo `SearchProducts` si aparece el caso (filtros por nombre, status, rango de precio)

### Infraestructura

- Índices DB: `idx_products_status`, `idx_products_name` (para filtros)
- Response headers: `X-Total-Count`, `X-Page`, `X-Limit` en listados paginados

### Presentación

- `GET /products?page=1&limit=20`
- `GET /products?status=ACTIVE`

**Exit criteria**: listar 10.000 productos con paginación responde < 200ms; el stock ya no vive en `Product`.

---

## v3 (Fase 4 · Performance)

**Objetivo**: aguantar picos de lectura sin tocar la DB.

### Infraestructura

- `ProductCacheService` sobre Redis
- Cache de `getProductBySerial` (TTL 5 min)
- Cache de listados con paginación (clave por `page:limit:filter`)
- **Invalidación explícita** en `CreateProduct` / `UpdateProduct`:
  - Al actualizar → borrar caché del producto específico
  - Al crear → invalidar listados cacheados
- Documentar trade-off: cache acelera lectura pero introduce complejidad de invalidación

### Presentación

- `GET /products` con cache hit → respuesta < 50ms
- Sin cambios en la API pública (es transparencia de infra)

**Exit criteria**: k6 con 1000 RPS sobre `GET /products` → p95 < 100ms; los writes invalidan correctamente.

---

## v4 / Backlog

**Objetivo**: features de catálogo avanzado. Solo cuando el negocio lo pida.

- Categorías / tags
- Búsqueda full-text (Postgres `tsvector` o Meilisearch)
- Imágenes (S3 + URLs firmadas)
- Precios con descuento / promociones
- Variantes (talle, color, SKU)
- Relacionados / recomendaciones
- Soft delete
- Versionado de precios (histórico)
- Cache pre-warming en arranque (Black Friday mindset)
- Read replicas para listados pesados

---

## Reglas del BC

| Regla | Por qué |
|---|---|
| `Product` es inmutable en su `id` y `serial` | Son identidad; cambiarlos rompe referencias |
| Precio se maneja siempre como `Money`, nunca como `number` suelto | Evita errores de redondeo y validación |
| Todo write pasa por `ProductRepository` | Un solo punto de invalidación de cache |
| Stock no se toca desde Catalog después de v2 | Es del BC Inventory |
| Endpoints de lectura sin auth | Catálogo público |
| Endpoints de escritura con `ADMIN` | Un solo rol con permiso de mutación |

---

## Estructura de archivos objetivo

```
src/modules/01catalog/
├── application/
│   ├── dto/
│   │   ├── request/         create-product, update-product, list-products (query)
│   │   └── response/        product.response
│   ├── mappers/             product.mapper
│   ├── ports/               stock-checker.port (hacia Inventory, v2)
│   └── use-cases/           create, update, list, get
├── domain/
│   ├── enums/               productStatus.enum
│   ├── value-objects/       serial.vo
│   ├── product.entity.ts
│   └── repositories/        product.repository
├── infra/
│   ├── adapters/            stock-checker.adapter (v2)
│   ├── cache/               product-cache.service (v3)
│   ├── persistence/         product.orm-entity, product.orm.mapper
│   └── repositories/        typeorm-product.repository
├── presentation/
│   └── catalog.controller.ts
└── catalog.module.ts
```

**MVP** construye: dominio, `create/update/list/get` use cases, repo TypeORM, controller con guards.
**v2** agrega: paginación en `list`, puerto hacia Inventory, extracción de `stock`.
**v3** agrega: `ProductCacheService`, invalidación en writes.
**v4** agrega: lo que pida el negocio.

---

## Dependencias entre BCs

| Depende de | Para qué | Dirección |
|---|---|---|
| Identity | `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()` | Catalog → Identity |
| Inventory | Validar stock, reservar (v2+) | Catalog → Inventory (vía puerto) |
| — | Cart, Ordering dependen de Catalog | Cart/Ordering → Catalog |

Catalog es **consumido por** Cart y Ordering vía puertos (`ProductCheckerPort`, `ProductFinderPort`). No los conoce directamente.

---

## Nota sobre el controller

En tu código actual, `CatalogController` tiene `GET /products/:id` pero el use case `GetProductUseCase` busca por **serial**. Hay que decidir:

- **Opción A**: `GET /products/:serial` (coherente con el VO, y como ya funciona el use case)
- **Opción B**: `GET /products/:id` (REST más clásico, requiere cambiar el use case)

Recomiendo **A** porque `serial` es el identificador de negocio (el usuario lo conoce), mientras que `id` es técnico. Si querés ambos, `GET /products/:serial` y `GET /products/by-id/:id`.
 