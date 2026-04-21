// **¿Cuándo sí necesitarías un agregado/entidad de dominio `StockReservation`?**

// - Si la reserva tiene **reglas de negocio complejas**
// (ej. expiración automática, no se puede liberar después de X tiempo, cambios de estado con validaciones).

// - Si quieres mantener el **principio de DDD puro** (capa de dominio sin dependencias de infraestructura).

// - Si necesitas **eventos de dominio** (ej. `StockReservationConfirmed`, `StockReservationExpired`).

// **Recomendación para tu nivel actual:**
// Quédate con la entidad de infraestructura (TypeORM) y la lógica en el servicio de aplicación.

// Es suficiente y evita over - engineering.
// Cuando la lógica de reservas crezca, refactorizas hacia un agregado de dominio.
