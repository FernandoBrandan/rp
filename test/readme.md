## 🧪 Unitarios (lógica aislada, sin dependencias externas)

### Catalog

- [ ] **Product entity** – Verificar que `updatePrice()`, `updateStock()`, `activate()` y `deactivate()` modifican correctamente las propiedades.
- [ ] **Money value object** – Comprobar que `add()` suma cantidades, `multiply()` multiplica y el constructor rechaza números negativos.
- [ ] **Serial value object** – Validar que el constructor lanza error si el string no empieza con `"PROD-"`.
- [ ] **ProductStatus value object** – Asegurar que `ACTIVE` e `INACTIVE` son singletons y `getValue()` retorna el string correcto.
- [ ] **ProductMapper (aplicación)** – Probar que `toResponse()` convierte un `Product` de dominio en `ProductResponseDTO` con todos los campos.
- [ ] **ProductCheckerService** (mockeando repositorio) – Validar que `validateAvailability()` retorna `isValid: false` con la razón adecuada para producto inexistente, inactivo o sin stock.
- [ ] **StockValidateService** (mockeando `DataSource`) – Comprobar que `reserveStock()` lanza error si algún producto no tiene suficiente stock.

### Cart

- [ ] **Cart entity** – Verificar que `addItem()` acumula cantidad si el producto ya existe, `removeItem()` elimina y `updateQuantity()` cambia la cantidad.
- [ ] **CartItem value object** – Validar que el constructor lanza error si la cantidad es ≤ 0.
- [ ] **CartMapper (aplicación)** – Probar que `toResponseDTO()` y `toEnrichedResponseDTO()` calculan `totalItems` y `totalPrice` correctamente.
- [ ] **AddToCartUseCase** (mockeando repositorio y productChecker) – Comprobar que rechaza producto inválido y que guarda el carrito cuando es válido.
- [ ] **UpdateQuantityUseCase** – Asegurar que solo actualiza si el producto existe en el carrito y el nuevo stock es suficiente.
- [ ] **RemoveFromCartUseCase** – Verificar que lanza `NotFoundException` si el carrito no existe o el producto no está.

### Order

- [ ] **Order entity** – Probar que `pay()` cambia estado a `PAID`, `fail()` a `FAILED` y `setPaymentUrl()` asigna URL solo si está `PENDING`.
- [ ] **OrderItem value object** – Validar que `subtotal()` retorna `price * quantity` y el constructor rechaza cantidad ≤ 0.
- [ ] **OrderStatus enum** – Comprobar que los valores son los esperados (`PENDING`, `WAITING_PAYMENT`, `PAID`, `FAILED`, etc.).
- [ ] **Money value object** (order) – Misma validación que en catalog, pero puede ser el mismo si se comparte.
- [ ] **OrderMapper (aplicación)** – Verificar que `toResponse()` convierte dominio a `OrderResponseDTO` incluyendo `paymentUrl`.
- [ ] **CreateOrderUseCase** (mockeando todo) – Asegurar que llama a `stockService.reserveStock()`, crea la orden, la guarda y emite `order.created`.
- [ ] **OrderPaidListener** (mockeando repositorio y stockService) – Probar que confirma reserva y actualiza la orden a `PAID`.
- [ ] **PaymentLinkCreatedListener** (mockeando repositorio) – Comprobar que asigna `paymentUrl` y cambia estado a `WAITING_PAYMENT`.
- [ ] **OrderPaymentFailedListener** – Validar que libera stock y cambia estado a `FAILED`.

### Payment

- [ ] **FakePaymentProvider** – Verificar que `generatePaymentLink()` retorna una URL con el `orderId` y que programa la emisión de `payment.approved` después del timeout.
- [ ] **HandleWebhookUseCase** (mockeando eventEmitter) – Probar que emite `order.paid` para status `approved` y `order.payment_failed` para `rejected`/`failed`.
- [ ] **OrderCreatedListener** (mockeando orderFinder y createPaymentLink) – Comprobar que al recibir `order.created` genera link y emite `payment.link.created`; si falla, emite `order.payment_failed`.

---

## 🔗 Integración (colaboradores reales, entorno controlado)

### Catalog

- [ ] **TypeOrmProductRepository** – Conectar a base de datos real (PostgreSQL en test) y probar `save()`, `findById()`, `findBySerial()`, `findAll()` y `reserveStock()`.
- [ ] **StockValidateService** – Usando transacción real, verificar que `reserveStock()` descuenta stock y crea reserva, y que `confirmReservation()` / `releaseReservation()` actualizan el estado correctamente.
- [ ] **ProductCheckerService** – Con repositorio real, probar `getDetails()` devuelve los datos del producto.

### Cart

- [ ] **TypeOrmCartRepository** – Probar `getCart()`, `save()` (insert/update) y `clear()` contra base de datos real.
- [ ] **AddToCartUseCase** – Con repositorio real y productChecker real (catalog), ejecutar el flujo completo de añadir producto y verificar persistencia.

### Order

- [ ] **TypeOrmOrderRepository** – Probar `createOrder()`, `getOrderDetail()`, `update()` y `findByIdempotencyKey()` con base de datos real.
- [ ] **OrderFinderService** – Verificar que `findById()` retorna el objeto plano esperado (con total e items) a partir del repositorio real.
- [ ] **OrderIdGenerator** – Con Redis real, comprobar que genera secuencias incrementales por día y que el fallback funciona si Redis falla.
- [ ] **CreateOrderUseCase** – Integración completa: repositorio real, stockService real (catalog), Redis real, eventEmitter real. Crear orden y verificar que se guarda, se reserva stock y se emite el evento.

### Payment

- [ ] **FakePaymentProvider + EventEmitter** – Integrar el provider con el eventEmitter real y verificar que después del timeout se emite `payment.approved` y luego `order.paid` (escuchando con un listener de prueba).
- [ ] **HandleWebhookUseCase** – Con eventEmitter real, enviar payload `approved` y verificar que se emite `order.paid`.
- [ ] **OrderCreatedListener** – Integración con orderFinder real (order) y createPaymentLink real (con fake provider). Al emitir `order.created`, comprobar que se genera link y se emite `payment.link.created`.

### Controladores (HTTP)

- [ ] **CatalogController** – Usando `supertest`, probar `POST /products`, `GET /products/:id`, `GET /products`, `PUT /products` con validaciones y códigos de estado.
- [ ] **CartController** – `POST /cart/:userId`, `GET /cart/:userId`, `PUT /cart/:userId`, `DELETE /cart/:userId/:productId`.
- [ ] **OrderController** – `POST /orders`, `GET /orders/:id`.
- [ ] **PaymentsController** – `POST /payments/webhook` con diferentes payloads.

---

## 🌐 End‑to‑End (flujos completos, todo real)

### Flujo feliz completo

- [ ] **Catalog → Cart → Order → Payment (fake)** – Crear producto, añadir al carrito, crear orden, esperar link, simular webhook `approved`, verificar que orden queda `PAID` y stock confirmado.
- [ ] **Catalog → Cart → Order → Payment (real MercadoPago)** – (requiere credenciales) Igual pero usando proveedor real y webhook real (o simulado con su API de pruebas).

### Flujos alternativos

- [ ] **Stock insuficiente** – Intentar crear orden con cantidad mayor al stock → orden no creada, error 500 o 400, stock no se modifica.
- [ ] **Pago rechazado** – Crear orden, webhook con status `rejected` → orden queda `FAILED` y stock liberado.
- [ ] **Producto inactivo** – Crear producto, desactivarlo, añadirlo al carrito → error en add-to-cart.
- [ ] **Idempotencia de orden** – Enviar dos veces el mismo `idempotencyKey` con mismo payload → segunda petición devuelve la misma orden sin duplicar stock ni reserva.
- [ ] **Webhook duplicado** – Enviar dos veces el mismo `paymentId` → solo la primera vez emite eventos y actualiza orden; la segunda es ignorada.
- [ ] **Time off (webhook antes de link)** – Forzar que el webhook llegue antes de que se procese `payment.link.created` (mediante delays) → el listener de pago debe reintentar o el orden no se actualiza hasta que el link esté disponible.

### Regeneración de link (opcional)

- [ ] **GET /orders/:id/payment-link** – Si el link falló, regenerar un nuevo link y actualizar la orden.
