
### Inventory

* Reserva temporal de stock hasta confirmación de pago
* Stock nunca puede quedar negativo
* Liberación automática si el pago falla

## Inventory

**Fase**: 1 (embebido) + 2 (extraído) · **Estado**: ⚠️ 30%

**Fase 1**: dentro de Catalog, tabla `stock_reservations`.

**Fase 2**: extraer a `05inventory` como BC propio.

**Invariantes**:

- Stock nunca negativo → `UPDATE ... WHERE stock >= qty`
- Reserva liberada si pago falla