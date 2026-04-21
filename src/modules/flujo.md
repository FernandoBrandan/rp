Aquí tienes un **checklist en formato tabla (estilo Excel)** para marcar cada etapa y flujo, incluyendo fallas. Copia y pega en tu Markdown, tacha con `[x]` a medida que avanzas.

## ✅ CHECKLIST POR ETAPA Y FLUJO

| OK? | Etapa             | Flujo          | Qué verificar                                                                       |
| --- | ----------------- | -------------- | ----------------------------------------------------------------------------------- |
| [x] | **Order**         | Happy          | CreateOrderUseCase crea orden y emite `order.created`                               |
| [x] | **Payment**       | Happy          | OrderCreatedListener genera link de pago → `payment.link.created`                   |
| [x] | **Order**         | Happy          | PaymentLinkCreatedListener cambia orden a WAITING_PAYMENT                           |
| [x] | **User**          | Happy          | Usuario paga en Mercado Pago (webhook recibido)                                     |
| [x] | **Payment**       | Happy          | HandleWebhookUseCase procesa pago aprobado → `order.paid`                           |
| [x] | **Order**         | Happy          | OrderPaidListener marca orden PAID                                                  |
| --- | ---               | ---            | ---                                                                                 |
| [ ] | **Payment**       | Fake           | OrderCreatedListener genera link fake (sin MP)                                      |
| [ ] | **Payment**       | Fake           | Simulador de pago automático → `order.paid`                                         |
| [ ] | **Order**         | Fake           | OrderPaidListener marca PAID (sin webhook real)                                     |
| --- | ---               | ---            | ---                                                                                 |
| [ ] | **Order**         | Fallo          | Datos inválidos / stock inválido / error DB → no emite evento                       |
| [ ] | **Payment**       | Fallo          | Order no existe / error DB / error generando link → no emite `payment.link.created` |
| [ ] | **Provider (MP)** | Fallo          | Error API MP / timeout / credenciales inválidas                                     |
| [ ] | **Order**         | Fallo          | En `payment.link.created`: orden no encontrada o estado inválido                    |
| [ ] | **Webhook**       | Fallo          | Payload inválido / firma inválida / orderId faltante / status desconocido           |
| [ ] | **Payment**       | Fallo          | Mapping incorrecto / estado no manejado → no emite `order.paid`                     |
| [ ] | **Order**         | Fallo          | En `order.paid`: orden no existe / ya pagada / error DB                             |
| --- | ---               | ---            | ---                                                                                 |
| [ ] | **Edge**          | Idempotencia   | Webhook duplicado no procesa dos veces el mismo pago                                |
| [ ] | **Edge**          | Timing         | Webhook llega antes que `payment.link.created` → orden aún no lista                 |
| [ ] | **Edge**          | Rechazo        | Pago rechazado → emite `payment_failed` o reintento                                 |
| [ ] | **Edge**          | Inconsistencia | Pago aprobado pero orden cancelada (manejar compensación)                           |

## 📌 ESTADOS CLAVE (verificar transiciones)

- [ ] Order: CREATED → WAITING_PAYMENT → PAID (o CANCELLED)
- [ ] Payment: PENDING → APPROVED (o FAILED)

## 🔁 EVENTOS EMITIDOS (verificar cada uno)

- [ ] `order.created`
- [ ] `payment.link.created`
- [ ] `order.paid`
- [ ] `order.payment_failed`

Así tienes todo comprimido, por filas, listo para tachar como en Excel.
