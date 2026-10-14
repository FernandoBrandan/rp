# Notification
* **Decisiones** 
  + [x] Desacoplada del dominio de negocio
  + [x] Event-driven interno (no Kafka)
  + [x] Canal console en Fase 1, email real en Fase 5

* **Fase 1** — MVP
  + [x] No crítico para MVP
  + [x] Puede ser solo log interno

* **Fase 5** — Real
  + [ ] BC propio `07notifications/`
  + [ ] Listener `order.paid` → email
  + [ ] Listener `order.failed` → email
  + [ ] Listener `order.created` → email (recordatorio)
  + [ ] `NotificationPort` + adapter SMTP/SendGrid/SES
  + [ ] Templates
  + [ ] Feature flag para activar/desactivar canal

* **Backlog** 
  + [ ] Push notifications
  + [ ] SMS
  + [ ] Multi-canal (usuario elige)
  + [ ] Preferencias de usuario

* **Dependencias** 
  + Notification ← Order (eventos)
  + No depende de nadie más
  + Nadie depende de Notification

---

---

---

---

---

---

---

* Desacoplada del dominio de negocio
* Emite notificaciones internas ante: orden pagada, orden fallida
* Listener de `order.paid` y `order.failed`
* Canal console en Fase 1, email real en Fase 5
# 🟢 6️⃣ Notification (mínimo viable)

No crítico para MVP.

Puede ser:

* Servicio interno que envía email
* O simplemente log

Si querés hacerlo bien:

* Emitir evento interno `OrderPaid`
* Notification escucha
* Envía mail

Event-driven interno, no Kafka.

---
