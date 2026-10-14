# Catalog
* **Decisiones** 
  + [x] Stock vive en Catalog durante MVP → se extrae a Inventory en Fase 2
    - MVP `Product`:`stock` 
  + [x] Endpoints de lectura sin auth, escritura con `ADMIN`
  + [x] Precio siempre como `Money`, nunca `number` suelto
  + [x] `id` y `serial` inmutables

* **Fase 1** — MVP
  + [x] Dominio
    - [x] `Product` (id, serial, name, price, stock, status)
    - [x] `Money`, `Serial`:`PROD-XXXXXX` VOs
    - [x] `ProductStatus` enum:`ACTIVE` | `INACTIVE`
    - [x] Invariantes: price ≥ 0, stock ≥ 0, name no vacío
    - [x] `Product.isActive()``ensureIsActive()` valida antes de operaciones
  + [x] Aplicación
    - [x] `CreateProduct` (admin)
    - [x] `UpdateProduct` (admin)
    - [x] `ListProducts` (público)
    - [x] `GetProduct` (por serial)
  + [x] Infraestructura
    - [x] `TypeOrmProductRepository`
    - [x] Tabla `products`
  + [x] Presentación
    - [x] `GET /products`
    - [x] `GET /products/:serial`
    - [x] `POST /products` (ADMIN) `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`
    - [x] `PUT /products` (ADMIN) `JwtAuthGuard` + `RolesGuard` + `@Roles('ADMIN')`
  + [ ] Bugs a arreglar
    - [ ] Trim + validar nombre en constructor `Product`
    - [ ] `UpdateProductUseCase` con try/catch → 400
    - [ ] Skip save si no hay cambios
    - [ ] `PUT /products/:serial` (no body)
    - [ ] Borrar dead code (`reserveStock` en repo, `aggregateRoot.ts`)

* **Fase 2** — Resiliencia: Extraer Inventory
  + [ ] Mover `Product`:`stock` a BC `05inventory`: Catalog: metadata + precio + status.
  + [ ] `Product.hasStockFor(qty)` vía puerto a Inventory
  + [ ] Paginación: `GET /products?page=1&limit=20`:`GET /products?status=ACTIVE`
  + [ ] SearchProducts: filtros por nombre, status, rango de precio
  + [ ] Response headers: `X-Total-Count`: `X-Page`: `X-Limit` en listados paginados
  + [ ] Índices DB: `idx_products_status`: `idx_products_name`
  + [ ] Check: listar 10.000 prod con Paginación resp < 200ms; stock ya no vive en `Product` .

* **Fase 4** — Cache: aguantar picos de lectura sin tocar la DB.
  + [ ] `ProductCacheService` sobre Redis
  + [ ] Cache `getProductBySerial` (TTL 5 min)
  + [ ] `GET /products` con cache hit → respuesta < 50ms
  + [ ] Cache de listados paginados  (clave por `page:limit:filter`)
  + [ ] Invalidación en `CreateProduct` / `UpdateProduct`
    - [ ] Al actualizar → borrar caché del producto específico
    - [ ] Al crear → invalidar listados cacheados
  + [ ] Documentar trade-off: cache acelera lectura pero introduce complejidad de invalidación
  + [ ] k6 con 1000 RPS sobre `GET /products` → p95 < 100ms; los writes invalidan correctamente.

* **Fase 5+** — Backlog
  + [ ] Categorías / tags
  + [ ] Búsqueda full-text (Postgres `tsvector` o Meilisearch)
  + [ ] Imágenes (S3) + URLs firmadas
  + [ ] Variantes (talle, color, SKU)
  + [ ] Precios con descuento / promociones
  + [ ] Relacionados / recomendaciones
  + [ ] Versionado de precios (histórico)
  + [ ] Soft delete
  + [ ] Read replicas para listados pesados
  + [ ] Cache pre-warming en arranque (Black Friday mindset)

* **Dependencias** 
  + Catalog → Identity (guards)
  + Catalog → Inventory (stock, vía puerto, Fase 2+)
  + Cart → Catalog (`ProductCheckerPort`)
  + Ordering → Catalog (`ProductFinderPort`:`StockPort`)

---

## Reglas del BC

| Regla                                                             | Por qué                                     |
| ----------------------------------------------------------------- | ------------------------------------------- |
| `Product` es inmutable en su `id` y `serial` | Son identidad; cambiarlos rompe referencias |
| Precio se maneja siempre como `Money` , nunca como `number` suelto | Evita errores de redondeo y validación      |
| Todo write pasa por `ProductRepository` | Un solo punto de invalidación de cache      |
| Stock no se toca desde Catalog después de v2                      | Es del BC Inventory                         |
| Endpoints de lectura sin auth                                     | Catálogo público                            |
| Endpoints de escritura con `ADMIN` | Un solo rol con permiso de mutación         |

---
 
 **MVP** construye: dominio, `create/update/list/get` use cases, repo TypeORM, controller con guards.
 **v2** agrega: paginación en `list` , puerto hacia Inventory, extracción de `stock` .
 **v3** agrega: `ProductCacheService` , invalidación en writes.
 **v4** agrega: lo que pida el negocio.

---

## Dependencias entre BCs

| Depende de | Para qué                                       | Dirección                        |
| ---------- | ---------------------------------------------- | -------------------------------- |
| Identity   | `JwtAuthGuard` , `RolesGuard` , `@CurrentUser()` | Catalog → Identity               |
| Inventory  | Validar stock, reservar (v2+)                  | Catalog → Inventory (vía puerto) |
| —          | Cart, Ordering dependen de Catalog             | Cart/Ordering → Catalog          |

Catalog es **consumido por** Cart y Ordering vía puertos ( `ProductCheckerPort` , `ProductFinderPort` ). No los conoce directamente.

---

## Nota sobre el controller

En tu código actual, `CatalogController` tiene `GET /products/:id` pero el use case `GetProductUseCase` busca por **serial** . Hay que decidir:

* **Opción A** : `GET /products/:serial` (coherente con el VO, y como ya funciona el use case)
* **Opción B** : `GET /products/:id` (REST más clásico, requiere cambiar el use case)

Recomiendo **A** porque `serial` es el identificador de negocio (el usuario lo conoce), mientras que `id` es técnico. Si querés ambos, `GET /products/:serial` y `GET /products/by-id/:id` .
