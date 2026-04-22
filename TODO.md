<!-- TODO.md -->

## 💥 Problemas de OrderCreated → Event → PaymentService

create-order.use-case.ts linea 85

- debugging difícil
- más moving parts
- no sabés si el problema es order o payment
- sobreingeniería para tu estado actual
- soluciones ??????

## Traer comentarios

### create-order.use-case.ts linea 70

- Implementado -> ver si testea bien ja!
- No es escalable (- loop + queries | múltiples productos → múltiples updates)
- Evolución futura - Cuando escales:
- - bulk update
- - o tabla de reservas
- - o sistema async

- El siguiente codigo no es escalable

```ts
const items = dto.items.map(
  (i) => new OrderItem(i.productId, i.quantity, new Money(i.price)),
);
```

### create-order.use-case.ts linea 90

Validar que generatelink tenga retry

- 6. El link de pago no se regenera en retry de idempotencia
- if (existingOrder) return OrderResponseDTO.fromDomain(existingOrder);
- Si la primera llamada creó la orden pero falló al generar el link, el cliente recibe una orden sin paymentUrl.
- Consecuencia: El cliente nunca ve la URL para pagar, y no hay forma de reintentar.

## Proximos pasos?

### A. Suscriptor de Inventario(InventorySubscriber)

- Escucha: OrderPaid
- Acción: Confirmar Stock. Mueve el stock de "Reservado" a "Vendido"(salida definitiva).
- Escucha: OrderPaymentFailed o OrderCancelled
- Acción: Liberar Stock. Mueve de "Reservado" a "Disponible".

### B. Suscriptor de Carrito(CartSubscriber)

- Escucha: OrderPaid
- Acción: Vaciar el carrito del usuario.
- ¿Por qué eventual? Porque si el carrito falla en borrarse, no queremos que el pago rebote.
- El usuario simplemente verá su carrito lleno un segundo más.

### C. Suscriptor de Notificaciones(NotificationSubscriber)

- Escucha: OrderCreated -> Envía "Tu orden está pendiente de pago".
- Escucha: OrderPaid -> Envía "¡Gracias por tu compra! Factura adjunta".

## Implementar src/modules/01catalog/domain/stock-reservation.entity.ts

**¿Cuándo sí necesitarías un agregado/entidad de dominio `StockReservation`?**

- Si la reserva tiene **reglas de negocio complejas**
  (ej. expiración automática, no se puede liberar después de X tiempo, cambios de estado con validaciones).

- Si quieres mantener el **principio de DDD puro** (capa de dominio sin dependencias de infraestructura).

- Si necesitas **eventos de dominio** (ej. `StockReservationConfirmed`, `StockReservationExpired`).

**Recomendación para tu nivel actual:**
Quédate con la entidad de infraestructura (TypeORM) y la lógica en el servicio de aplicación.

Es suficiente y evita over - engineering.
Cuando la lógica de reservas crezca, refactorizas hacia un agregado de dominio.

## Comentarios para src/infra/database/database.module.ts

useFactory: (config: ConfigService) => ({})

- autoLoadEntities: true, : ← carga entidades registradas con forFeature()
- synchronize: true, : ⚠️ SOLO DEV, NO USAR EN PRODUCCIÓN
- logging: true, : 👈 clave para ver queries

## Configurar bien Swagger

## implementar - modules/04 payments/infra/providers/MercadoPago.provider.ts

async createPaymentLink(input: CreatePaymentDto): Promise<PaymentLink> {
implementación real
}
