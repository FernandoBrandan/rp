# 🛒 Ecommerce Platform – Technical Documentation

## Resumen del proyecto

API REST modular para un ecommerce con carrito de compras, gestión de productos, órdenes y procesamiento de pagos.
Implementa arquitectura hexagonal (puertos y adaptadores) en ciertos módulos, y comunicación asíncrona mediante eventos de dominio.

## Tecnologías principales

- **Framework**: NestJS (Node.js + TypeScript)
- **ORM**: TypeORM con PostgreSQL
- **Cache / secuencias**: Redis (ioredis)
- **Logging**: Winston + correlation-id
- **Eventos**: @nestjs/event-emitter
- **Validación**: class-validator + class-transformer
- **Testing**: Jest (unitario e integración) + Supertest (E2E)
- **Contenedores**: Docker / Docker Compose

## Arquitectura

- **Modular por dominio**: catalog, cart, order, payment, identity (pendiente)
- **Capa de dominio**: entidades, value objects, eventos de dominio, interfaces de repositorio
- **Capa de aplicación**: casos de uso, listeners de eventos, DTOs, mappers, puertos (interfaces)
- **Infraestructura**: repositorios TypeORM, servicios de terceros (MercadoPago, FakePayment), Redis
- **Presentación**: controladores REST

## Flujo principal (happy path)

1. `POST /products` – crear producto (catalog)
2. `POST /cart/{userId}` – añadir producto al carrito (cart)
3. `POST /orders` – crear orden (order) → reserva stock → emite `order.created`
4. Listener `OrderCreatedListener` (payment) → genera link de pago → emite `payment.link.created`
5. Listener `PaymentLinkCreatedListener` (order) → asigna URL y cambia estado a `WAITING_PAYMENT`
6. Webhook `POST /payments/webhook` → pago aprobado → emite `order.paid`
7. Listener `OrderPaidListener` (order) → cambia estado a `PAID` y confirma stock

## Decisiones clave

- **Generación de ID de orden**: formato `ORDER-YYYYMMDD-XXXX` con Redis para secuencia diaria + fallback a UUID.
- **Proveedores de pago**: abstracción mediante `PaymentProviderPort`; implementación fake para desarrollo, MercadoPago para producción.
- **Manejo de stock**: reserva síncrona al crear la orden, confirmación asíncrona al recibir `order.paid`, liberación en caso de fallo.
- **Idempotencia**: mediante `idempotencyKey` en la creación de órdenes.
- **Correlation ID**: middleware que propaga un ID único a través de toda la traza.

## Pendientes / mejoras identificadas

- Tests unitarios e integración (listados en `docs/testing-checklist.md`)
- Implementar idempotencia en webhook de pagos
- Endpoint para regenerar link de pago
- Módulo Identity completo (autenticación JWT)

---

# 🚀 Ecommerce Platform – Visión general

Una API de comercio electrónico moderna, modular y escalable.
Permite gestionar productos, carritos de compra, órdenes y pagos de manera fluida y confiable.

## ¿Qué problema resuelve?

- **Gestión de inventario**: control de stock con reservas automáticas.
- **Carrito de compras**: persistente y enriquecido con precios actualizados.
- **Órdenes**: generación de IDs únicos, manejo de idempotencia, estado (pendiente → esperando pago → pagado → fallido).
- **Pagos**: integración con proveedores (MercadoPago / modo fake) mediante webhooks asíncronos.

## Principales funcionalidades

- CRUD de productos con serial único y control de stock.
- Carrito por usuario (agregar, eliminar, actualizar cantidades).
- Creación de órdenes con reserva de stock y generación de link de pago.
- Recepción de webhooks de pago (aprobado/rechazado) y actualización automática del estado de la orden.
- Logs estructurados con correlation ID para trazabilidad.

## Valor para el negocio

- **Alta disponibilidad**: arquitectura desacoplada por eventos, tolerante a fallos parciales.
- **Preparado para escalar**: módulos independientes, caché con Redis, base de datos relacional.
- **Reducción de errores**: idempotencia en órdenes y pagos evita duplicaciones.
- **Rápido onboarding**: estructura de carpetas estandarizada y documentación técnica clara.

## Equipo y metodología

- Código 100% TypeScript, siguiendo principios SOLID y DDD.
- Pruebas planificadas (unitarias, integración, E2E).
- Entorno de desarrollo con Docker compose.
