- Desacoplada del dominio de negocio
- Emite notificaciones internas ante: orden pagada, orden fallida
- Listener de `order.paid` y `order.failed`
- Canal console en Fase 1, email real en Fase 5

# 🟢 6️⃣ Notification (mínimo viable)

No crítico para MVP.

Puede ser:

- Servicio interno que envía email
- O simplemente log

Si querés hacerlo bien:

- Emitir evento interno `OrderPaid`
- Notification escucha
- Envía mail

Event-driven interno, no Kafka.

---
