# Shipping
* **Decisiones** 
  + [x] Fase 5 (post-MVP)
  + [x] Mock carrier con timeout + retry
  + [x] Estados `SHIPPED` / `DELIVERED` en Order

* **Fase 5** — Implementación
  + [ ] Dominio
    - [ ] `Shipment` (orderId, carrier, trackingId, status)
    - [ ] `ShippingCost` (calculadora por zona/peso)
    - [ ] `CarrierPort` (interface)
  + [ ] Aplicación
    - [ ] `CalculateShipping` (cotización)
    - [ ] `CreateShipment` (al pasar a PAID)
    - [ ] `TrackShipment` (consulta estado)
  + [ ] Infraestructura
    - [ ] `MockCarrierAdapter` (con timeout + retry)
    - [ ] `CarrierProvider` real (Andreani/OCA/Correo)
    - [ ] Webhook receiver (validación HMAC)
    - [ ] Polling fallback (pull si webhook no llega)
  + [ ] Presentación
    - [ ] `POST /shipping/quote`
    - [ ] `GET /shipping/:orderId/tracking`
    - [ ] `POST /shipping/webhook`
  + [ ] Integración con Order
    - [ ] Listener `order.paid` → crear shipment
    - [ ] Listener `shipment.dispatched` → `Order.ship()`
    - [ ] Listener `shipment.delivered` → `Order.deliver()`

* **Conceptos a practicar** 
  + [ ] Adapter pattern (múltiples carriers)
  + [ ] Anti-Corruption Layer (traducir API externa)
  + [ ] Webhook idempotency
  + [ ] Polling fallback
  + [ ] Feature flags

* **Exit criteria** 
  + [ ] Crear orden → pagar → despachar → entregar (e2e)
  + [ ] Webhook de shipping actualiza tracking

* **Dependencias** 
  + Shipping → Identity (guards)
  + Shipping → Order (eventos)
  + Shipping → `infra/resilience/`
  
  
  ---
  ---
  ---
  ---
  
  ## Shipping

* Cálculo de costo
* Mock carrier con timeout + retry
* Estados `SHIPPED` / `DELIVERED` en Order
