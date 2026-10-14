# Inventory
* **Decisiones** 
  + [x] Fase 1: embebido en Catalog (tabla `stock_reservations`)
  + [x] Fase 2: extraer a `05inventory` como BC propio
  + [x] Stock nunca negativo → `UPDATE ... WHERE stock >= qty`
  + [x] Reserva liberada si pago falla

* **Fase 1** — Embebido en Catalog
  + [x] `StockReservationEntity` en `01catalog/infra/persistence/`
  + [x] `StockReservationAdapter` en `01catalog/infra/adapters/`
  + [x] `StockPort` consumido por Order
  + [x] Estados: `RESERVED | CONFIRMED | RELEASED`
  + [ ] Bugs a arreglar
    - [x] `confirmReservation` idempotente
    - [x] `releaseReservation` idempotente
    - [ ] Lock pesimista en confirm/release

* **Fase 2** — Extraer a BC propio
  + [ ] Crear `src/modules/05inventory/`
  + [ ] Mover `StockReservationEntity` + adapter
  + [ ] Mover `StockPort` (decidir dónde vive: Order o Inventory)
  + [ ] Nuevo `inventory.module.ts`
  + [ ] Actualizar imports en Order y Catalog
  + [ ] Tests de integración apuntando al nuevo BC

* **Fase 2+** — Modelo completo
  + [ ] `InventoryItem`
    - [ ] id
    - [ ] productId (validar contra Catalog)
    - [ ] stock (total)
    - [ ] available (total - reserved)
    - [ ] reserved
    - [ ] minimumStock
    - [ ] purchasePrice
  + [ ] `StockMovement`
    - [ ] productId
    - [ ] quantity
    - [ ] type (PURCHASE | SALE | ADJUSTMENT | RETURN)
    - [ ] referenceId (orderId o purchaseOrderId)
    - [ ] createdAt
  + [ ] Eventos
    - [ ] `stock.low` → notificar a Catalog
    - [ ] `stock.depleted` → Catalog marca INACTIVE
    - [ ] `stock.replenished` → Catalog reactiva producto
  + [ ] Reportes: rotación, quiebres de stock, cobertura

* **Dependencias** 
  + Inventory → Identity (guards)
  + Inventory → Catalog (validar productId)
  + Ordering → Inventory (`StockPort`)
  + Catalog ← Inventory (eventos de stock)

* **Ver TODO.md** para el modelo estructural de `IProduct` (SKU, salePrice, etc.)

---
------
------
------
------
------
------
------
------
------

### Inventory

* Reserva temporal de stock hasta confirmación de pago
* Stock nunca puede quedar negativo
* Liberación automática si el pago falla

## Inventory

 **Fase**: 1 (embebido) + 2 (extraído) · **Estado** : ⚠️ 30%

 **Fase 1** : dentro de Catalog, tabla `stock_reservations` .

 **Fase 2** : extraer a `05inventory` como BC propio.

 **Invariantes** :

* Stock nunca negativo → `UPDATE ... WHERE stock >= qty`
* Reserva liberada si pago falla
