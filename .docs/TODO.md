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

* Usecase
* - validad si existe producto
* - No existe: emitir evento de stock `quisieron comprar`
* - Dejar el producto innactivo hasta reestockear
* - En invetary si repone stock emitir evento a catalogo `activar`

* Modulo inventario: Main
  InventoryItem - ejemplo
  ├── id
  ├── productId - validar en catalog
  ├── stock - total
  ├── available - total - reserved ??
  ├── reserved
  ├── minimumStock
  ├── purchasePrice

* Modulo inventario: Registra movimientos
  StockMovement
  ├── productId - validar en catalog
  ├── quantity
  ├── type = PURCHASE
  ├── referenceId = purchaseOrderId
  └── createdAt

## Ver

* Los @OnEvent no son transaccionales:
* - si OrderPaidListener falla a medias (pay() ok, confirmReservation() falla) queda inconsistente.
* - Considera outbox pattern.

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
    - Mover la responsabilidad a catalog **desacopla order de stock** , pero agrega un salto extra
    - **Decisión recomendada** : dejarlo como está. Es un refactor de gusto, no de correctitud. Si en algún momento `stock` crece (múltiples almacenes, expiraciones), ahí se separa.

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

* El requerimiento lista Inventory como BC propio
* La tabla stock_reservations no debería estar en el módulo Catalog
* Si mañana otro módulo necesita reservar stock (¿Shipping? ¿un admin?), importaría desde Catalog

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

Una **invariante** es una regla de negocio que **siempre debe cumplirse** , sin importar qué camino tome el código. 
No es validación de input — es validación de **estado del dominio** .

Ejemplos:

* "El total de una orden es inmutable una vez creada"
* "El stock nunca puede ser negativo"
* "Una orden no puede pasar de `FAILED` a `PAID` sin nuevo intento"
* "Una orden debe tener al menos 1 item"

### Tu estado — acá estás **regular** 

 **Invariantes que SÍ protegés** :

| Invariante                | Dónde                                             | ✅/❌           |
| ------------------------- | ------------------------------------------------- | --------------- |
| Monto no negativo         | `Money` constructor                               | ✅              |
| Stock no negativo         | `Product.updateStock()` valida `stock < 0` | ✅ (en memoria) |
| Cantidad positiva         | `CartItem` , `OrderItem` constructores             | ✅              |
| Orden con al menos 1 item | `Order.create()` | ✅              |
| Precio autoritativo       | `CreateOrderUseCase` reemplaza precio del cliente | ✅              |
| Total inmutable           | El `total` es readonly en `Order` | ✅              |
| Transiciones válidas      | Métodos de `Order` validan                        | ⚠️ parcial      |

## **Invariantes que NO protegés** (¡ojo acá!):

* **"Stock nunca negativo"** 
*  - Solo se valida en memoria y en la query `WHERE stock >= :qty` . 
*  - Pero si dos transacciones concurrentes pasan el chequeo antes del decremento, ambas pueden restar → **race condition** 

* **"El total es inmutable"** 
* - El campo es `readonly` pero el **mapper de persistencia** puede sobrescribirlo. 
* - Y si `Order.pay()` tocara items, se rompería

* **"FAILED no puede ir a PAID"** 
* - `pay()` valida estado pero... ¿qué pasa si alguien llama `order.status = 'PAID'` directo? 
* - En TypeScript no podés evitar eso, pero podés hacer `status` privado con getter

* **"Una reserva no puede tener stock negativo"** 
* - `releaseReservation` suma stock sin re-verificar el techo máximo

* **"Una orden cancelada no puede tener reserva activa"** 
* No lo valida nadie

* **"Cada producto en una orden es único"** 
* - No lo validás — podés crear orden con `[{A, 2}, {A, 3}]` |

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

 **Solución**: usar `UPDATE products SET stock = stock - X WHERE id = Y AND stock >= X` . Si `affected === 0` , falló. **Eso ya lo hacés bien** en `StockReservationAdapter.reserveStock()` :

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

✅ Ahí **sí** está protegida la invariante. El problema es que ** `Product.updateStock()` ** en memoria **no** tiene esa protección — si alguien lo usa para decrementar, podés romperlo.

### Qué hacer

 **Regla práctica**: las invariantes críticas (stock, total, transiciones) deben estar protegidas en **al menos uno** de estos niveles:

01. **Entidad de dominio** (validación en métodos): `Product.updateStock()` no permite negativos
02. **Repositorio** (constraint en DB): `CHECK (stock >= 0)` en la tabla
03. **Query atómica** (WHERE + UPDATE): el `WHERE stock >= :qty` que ya hacés
04. **DB constraint** : `UNIQUE(idempotencyKey)` en orders

 **Hoy tenés 1 y 3** , pero te faltan:

* Constraint `CHECK (stock >= 0)` en la tabla `products`
* Constraint `CHECK (quantity > 0)` en `order_items` (aunque es JSON, no aplica)
* El campo `status` de `Order` no es privado → cualquiera lo puede setear

### Veredicto

❓ **Invariantes protegidas**: las principales **sí**, pero hay huecos. Es un concepto que se refuerza con **tests** — si escribís un test que intenta `order.pay()` sobre una orden `FAILED` y esperás excepción, la invariante queda documentada y verificada.

--- 
