# Payment — reconciliación código ↔ notas

Igual que en Ordering: primero leo el código, después reconcilio. Y acá hay una tensión **más grande** que en Ordering.

---

## 1. Diagnóstico: qué hay **realmente** en el código

### Archivos del BC
```
04payments/
├── application/
│   ├── listeners/order-created.listener.ts
│   ├── ports/order-finder.port.ts
│   ├── ports/order-payment-status.port.ts
│   ├── ports/payment-provider.port.ts
│   └── use-cases/create-payment-link.use-case.ts
│   └── use-cases/handle-webhook.use-case.ts
├── infra/providers/fake-payment.provider.ts
├── infra/providers/mercado-pago.provider.ts
├── payment.module.ts
└── presentation/payments.controller.ts
```

### Flujo real que implementa el código

```
POST /orders
  → CreateOrderUseCase (Order)
  → emite `order.created`
       ↓
OrderCreatedListener (Payment)
  → markGenerating()
  → CreatePaymentLinkUseCase → FakePaymentProvider.generatePaymentLink()
  → emite `payment.link.created`
       ↓
PaymentLinkCreatedListener (Order)
  → setPaymentUrl() + waiting_payment() + markPaymentReady()
       ↓
       ┌─ Usuario paga en URL externa (FakePaymentProvider simula) ─┐
       ↓                                                            ↓
  evento `order.paid`                                    evento `order.payment_failed`
       ↓                                                            ↓
OrderPaidListener (Order)                         OrderPaymentFailedListener (Order)
  → pay() + confirmReservation()                    → releaseReservation() + fail()
```

### Decisiones que emergieron del código

| Cosa | Cómo está hoy |
|---|---|
| **Link de pago asíncrono** | Listener reacciona a `order.created`, no en el request |
| **Provider intercambiable** | Factory que elige `fake` o `mercadopago` por config |
| **Outcome del fake configurable** | `FAKE_PAYMENT_OUTCOME` (`approved` \| `failed` \| `pending`) |
| **Delay del fake configurable** | `FAKE_PAYMENT_DELAY_MS` |
| **Webhook como input externo** | `POST /payments/webhook` con `{ id, status, metadata.orderId }` |
| **Estados terminales amplios** | `approved/succeeded/paid` y `failed/rejected/cancelled` |

---

## 2. La tensión: **síncrono vs asíncrono**

Tus notas dicen:

> *"Payment es crítico. No lo hagas asincrónico sin razón.*
> *Crear order en estado PENDING → intentar cobrar sincrónicamente → cambiar estado según resultado."*

Tu código dice lo contrario:

> La orden se crea → se emite `order.created` → **un listener** genera el link → el usuario paga **después** → un webhook confirma.

**No son lo mismo. Son dos modelos distintos:**

| Modelo | Cuándo se cobra | Estado intermedio | Ejemplo real |
|---|---|---|---|
| **A — Síncrono** | En el request de checkout | No hay. `PENDING → PAID` o `FAILED` | One-click, cobro con tarjeta guardada |
| **B — Asíncrono** | Después, en una URL externa | `WAITING_PAYMENT` | MercadoPago, Stripe Checkout, PayPal |

**El código implementa B. Las notas piden A.**

### ¿Cuál es el correcto?

**B, para un e-commerce.** Y no es opinión mía — es la realidad del proveedor que ya tenés stubbeado: **MercadoPago es un flujo de link de pago**. Su API devuelve `init_point` o `sandbox_init_point`, el usuario es redirigido, paga en la plataforma de MP, y MP notifica por webhook.

Un flujo síncrono no es "menos complejo" — es **otro flujo**, válido para otro tipo de provider. Si mañana agregás Stripe con `PaymentIntent` server-side, ahí sí entrás en Modelo A.

**Recomendación**: **quedarse con B** y corregir la nota. Pero **documentar por qué**, porque "es crítico, no lo hagas asincrónico" es un buen consejo general que no aplica a este tipo de integración.

### El verdadero consejo que sí aplica

El consejo de "no asincrónico sin razón" es contra **sagas distribuidas** y **orquestadores de 10 pasos**. Vos no tenés eso. Tenés:

- **Un** evento interno (`order.created`)
- **Dos** listeners en el mismo proceso
- **Un** input externo (webhook)

Eso es **asincronía controlada**, no saga. Es perfectamente válido.

**Regla**: asincrónico entre **BCs del mismo monolito** = OK. Saga distribuida entre **servicios** = no en MVP.

---

## 3. Lo que tenés bien (y vale la pena reconocer)

| Cosa | Por qué es un acierto |
|---|---|
| `PaymentProviderPort` como interface | Desacopla el BC del provider concreto |
| Factory que elige por config | Cambiar provider sin tocar código |
| `FakePaymentProvider` con delay configurable | Simula latencia real |
| Webhook como input HTTP | Modela el flujo real de MercadoPago/Stripe |
| `HandleWebhookUseCase` ignora statuses no terminales | Correcto: `pending` no cambia nada |
| `OrderPaymentStatusPort` separa el link del ciclo de Order | Alta cohesión |
| `OrderCreatedListener` marca `markGenerating` antes de llamar al provider | Si falla, se puede detectar "atascado en GENERATING" |

---

## 4. Spec: Payment ordenado por fases

---

## FASE 1 — MVP (con deudas)

**Objetivo**: crear link de pago para una orden, simular pago/fallo, y confirmar el estado de la orden vía webhook o simulación.

### Dominio

**Modelo**: **NO** hay una entidad `Payment` persistida en el MVP. El estado del pago **vive en `Order`** (vía `PaymentStatus` + `paymentUrl`). Ver decisión D1 abajo.

**Puertos** (interfaces):
- `PaymentProviderPort` — `generatePaymentLink(order) → { url }`
- `OrderFinderPort` — leer orden de Order
- `OrderPaymentStatusPort` — `markGenerating(orderId)`, `markFailed(orderId)`

### Aplicación

- `CreatePaymentLinkUseCase` — delega al provider, valida URL no vacía
- `HandleWebhookUseCase` — interpreta status del provider, emite evento interno

### Infraestructura

- `FakePaymentProvider` — simulador configurable:
  - `FAKE_PAYMENT_OUTCOME`: `approved` \| `failed` \| `pending`
  - `FAKE_PAYMENT_DELAY_MS`: latencia simulada
  - Emite `order.paid` o `order.payment_failed` después del delay
- `MercadoPagoProvider` — stub (throw `NotImplementedException`)
- Factory en `payment.module.ts` que elige por `PAYMENT_PROVIDER` config

### Presentación

- `POST /payments/webhook` — recibe `{ id, status, metadata.orderId }`

### Listeners

- `OrderCreatedListener` — reacciona a `order.created`, genera link, emite `payment.link.created`

### Deudas del MVP actual

| Deuda | Archivo | Prioridad |
|---|---|---|
| `setTimeout(...).unref()` es fire-and-forget: no hay retry | `fake-payment.provider.ts` | Alta |
| Sin timeout explícito en la llamada al provider | `create-payment-link.use-case.ts` | Alta |
| `markGenerating` no es idempotente (si ya está GENERATING, no debería hacer nada) | `order-payment-status.adapter.ts` | Media |
| `markFailed` puede fallar si ya está READY | `order-payment-status.adapter.ts` | Media |
| Webhook sin validación de firma | `payments.controller.ts` | Baja en MVP, Alta en v2 |
| Webhook sin idempotencia (mismo webhook 2 veces) | `handle-webhook.use-case.ts` | Media |

**Exit criteria**: crear orden → link generado en ≤ 3s → pago simulado → orden `PAID`. Con `FAKE_PAYMENT_OUTCOME=failed`, orden `FAILED` y stock liberado.

---

## FASE 2 — Resiliencia (el corazón del BC)

**Objetivo**: el provider puede fallar, tardar o estar caído, y el sistema no se rompe. **Esta es la fase donde el Fake se vuelve una herramienta de simulación seria.**

### `infra/resilience/` (compartido con Shipping)

- `withTimeout(promise, ms, label)` — corta si tarda demasiado
- `withRetry(fn, { attempts, baseMs, maxMs })` — backoff exponencial
- `CircuitBreaker` — CLOSED / OPEN / HALF_OPEN en memoria
- `Bulkhead` — limita llamadas concurrentes al provider

### Provider fake — modo simulador serio

El fake deja de ser "un `setTimeout` con delay" y se vuelve un **simulador de fallos**:

**Config extendida**:
```env
FAKE_PAYMENT_OUTCOME=approved|failed|pending|flaky|timeout
FAKE_PAYMENT_DELAY_MS=3000
FAKE_PAYMENT_TIMEOUT_RATE=0.20   # 20% probabilidad de timeout
FAKE_PAYMENT_FAILURE_RATE=0.10   # 10% probabilidad de fallo aleatorio
FAKE_PAYMENT_SEED=order-123      # opcional: determinismo por orden
```

**Comportamiento**:

| Outcome | Simula |
|---|---|
| `approved` | Pago OK inmediato (o con delay) |
| `failed` | Pago rechazado |
| `pending` | Nunca resuelve (usuario abandonó) |
| `flaky` | 20% timeout / 10% fail / resto approved (según rates) |
| `timeout` | Nunca responde → dispara el `withTimeout` |
| `seed` | Mismo `orderId` → mismo resultado (para tests reproducibles) |

**El fake se envuelve con la capa de resiliencia**:
```ts
async generatePaymentLink(order) {
  return this.circuitBreaker.exec(() =>
    withRetry(
      () => withTimeout(
        this.fakeCall(order),
        this.timeoutMs,
        'payment.generatePaymentLink',
      ),
      { attempts: 3, baseMs: 1000 },
    ),
  );
}
```

### Aplicación

- `CreatePaymentLinkUseCase` gana timeout explícito
- `HandleWebhookUseCase` gana validación de firma (HMAC)

### Presentación

- `POST /payments/webhook` — valida `X-Signature` contra `WEBHOOK_SECRET`
- Webhook idempotente: guardar `providerEventId` procesados en Redis (TTL 24h)

### Observabilidad

- Contador `payment_failures_total{reason}` — separa `timeout` / `rejected` / `circuit_open`
- Contador `payment_link_generated_total`
- Gauge `payment_circuit_breaker_state` (0 cerrado, 1 half, 2 abierto)

**Exit criteria**: con `FAKE_PAYMENT_TIMEOUT_RATE=0.20` y 100 órdenes, el error rate real excluyendo simulados < 2%. El circuit breaker se abre tras 5 fallos consecutivos y se recupera.

---

## FASE 3 — Provider real (MercadoPago)

**Objetivo**: reemplazar el fake por integración real sin tocar dominio.

### Infraestructura

- `MercadoPagoProvider` completo:
  - OAuth con `MERCADOPAGO_ACCESS_TOKEN`
  - Crear preference (`/checkout/preferences`)
  - Devolver `init_point`
  - Validar firma del webhook (`x-signature` con secret)
  - Verificar pago contra API antes de confiar en el webhook
- Persistencia de `providerRef` (id externo del pago) en `Order` o tabla aparte

### Presentación

- `POST /payments/webhook` — parsea formato MercadoPago (`data.id`, `type`, `action`)
- `GET /payments/:orderId/status` — consulta el estado actualizado al provider (pull fallback)

### Config

```env
PAYMENT_PROVIDER=mercadopago
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_WEBHOOK_SECRET=...
```

**Exit criteria**: sandbox de MercadoPago → crear preferencia, pagar con tarjeta de prueba, recibir webhook, orden `PAID`.

---

## FASE 4 / Backlog

- Métodos de pago múltiples (Stripe, PayPal) con selector por región
- Refunds (parciales y totales)
- Reembolsos automáticos desde `PAID → CANCELLED`
- 3DS / SCA (autenticación fuerte del cliente)
- Guardar métodos de pago (tokens) para one-click
- Facturación electrónica
- Webhook replay attack protection (nonce + timestamp)
- Separación de Billing como BC propio (si el volumen lo justifica)

---

## 5. Decisiones pendientes

### D1. ¿Existe una entidad `Payment` persistida?

**Hoy**: no. El pago vive como `Order.paymentStatus` + `Order.paymentUrl`.

- **A favor de no persistir**: menos tablas, MVP simple.
- **A favor de persistir**: auditoría (¿cuántos intentos? ¿qué providerRef?), soporte de múltiples intentos de pago, soporte de múltiples métodos.

**Recomendación**: **no en MVP**, sí en Fase 3 (cuando entrás a MercadoPago real, necesitás `providerRef`). En ese momento se crea tabla `payments(id, orderId, provider, providerRef, status, amount, createdAt)`.

### D2. ¿Síncrono o asíncrono?

**Recomendación**: **asíncrono** (link de pago). Corregir la nota. Documentar en ADR por qué el consejo "no asincrónico" no aplica al modelo MercadoPago.

### D3. ¿El fake simula 20% timeout / 10% fallo siempre, o configurable?

Tus notas dicen 20%/10% fijo. **Recomendación**: **configurable**, con esos valores como default. Razón: en tests de happy path querés 0%, en tests de resiliencia querés 100%.

### D4. ¿Firma de webhook en MVP o v2?

**Recomendación**: **v2**. En MVP el fake es interno y no puede ser "atacado". En v3 con MercadoPago real, es obligatorio.

### D5. ¿`FakePaymentProvider` sigue siendo "fake" o se renombra a "simulator"?

**Recomendación**: renombrar a `SimulatedPaymentProvider` o `FaultInjectorProvider`. La palabra "fake" sugiere "menos serio". El simulador es una **herramienta de calidad** tan importante como el provider real.

---

## 6. Diferencias con las notas

| Nota | Código | Reconciliación |
|---|---|---|
| Síncrono en checkout | Asíncrono con link | **Asíncrono**, corregir nota |
| Entidad `Payment` | No existe | No en MVP, sí en Fase 3 |
| `ProcessPayment` use case | No existe (hay `CreatePaymentLink` + `HandleWebhook`) | Correcto así — son dos responsabilidades |
| 20% timeout / 10% fail fijo | No existe | Configurable en v2 |
| Mock de pasarela | Sí, `FakePaymentProvider` | OK |
| No saga / no event bus | Cumplido | OK |

---

## 7. Fixes priorizados

| # | Fix | Archivo | Fase |
|---|---|---|---|
| 1 | `markGenerating` idempotente | `order-payment-status.adapter.ts` | 1 |
| 2 | `markFailed` idempotente y no falla si READY | `order-payment-status.adapter.ts` | 1 |
| 3 | Renombrar `FakePaymentProvider` → `SimulatedPaymentProvider` | `infra/providers/` | 1 |
| 4 | `infra/resilience/` (timeout, retry, breaker, bulkhead) | nuevo | 2 |
| 5 | Aplicar resiliencia al provider en `CreatePaymentLinkUseCase` | `create-payment-link.use-case.ts` | 2 |
| 6 | Simulación configurable 20%/10% | `simulated-payment.provider.ts` | 2 |
| 7 | Seed determinístico por `orderId` | idem | 2 |
| 8 | Métrica `payment_failures_total{reason}` | `infra/metrics/` | 2 |
| 9 | Firma HMAC de webhook | `payments.controller.ts` | 2 |
| 10 | Webhook idempotente (Redis `providerEventId`) | `handle-webhook.use-case.ts` | 2 |
| 11 | `MercadoPagoProvider` completo | `infra/providers/` | 3 |
| 12 | Persistir `providerRef` | nueva tabla `payments` | 3 |

---

## 8. Estructura de archivos objetivo

```
src/modules/04payments/
├── application/
│   ├── listeners/
│   │   └── order-created.listener.ts
│   ├── ports/
│   │   ├── order-finder.port.ts
│   │   ├── order-payment-status.port.ts
│   │   └── payment-provider.port.ts
│   └── use-cases/
│       ├── create-payment-link.use-case.ts
│       └── handle-webhook.use-case.ts
├── domain/                          (vacío en MVP, se agrega Payment en Fase 3)
│   ├── payment.entity.ts (Fase 3)
│   └── value-objects/providerRef.vo.ts (Fase 3)
├── infra/
│   └── providers/
│       ├── simulated-payment.provider.ts   ← renombrado
│       └── mercado-pago.provider.ts
├── payment.module.ts
└── presentation/
    └── payments.controller.ts
```

Y como dependencia:
```
src/infra/resilience/                ← compartido con Shipping
├── with-timeout.ts
├── with-retry.ts
├── circuit-breaker.ts
└── bulkhead.ts
```

---

## 9. Sobre el "tiene que ser fake"

Entiendo la incomodidad. La forma de sacártela es dejar de llamarlo "fake" y pensarlo como **simulador de fallos**.

Un simulador bien hecho te da:

1. **Reproducibilidad**: mismo `orderId` → mismo resultado (con seed)
2. **Control de caos**: forzar timeout, forzar circuit open, forzar fallo intermitente
3. **Métricas de resiliencia**: con 20% de timeout simulado, ¿el sistema se recupera?
4. **Tests deterministas**: `FAKE_PAYMENT_OUTCOME=failed` en un test no debería depender del azar

Un `FakePaymentProvider` que solo hace `setTimeout(3s)` **no es un simulador**, es un placeholder. La diferencia es cuánta diversidad de fallos puede inyectar.

**El simulador es el activo más valioso de este BC en MVP.** El provider real es la Fase 3. El simulador es el que te permite demostrar que el sistema es resiliente *hoy*.

---

¿Seguimos con **Inventory** (último BC antes de cerrar el spec) o preferís que arme ya el `PLAYBOOK.md` completo con las 6 fases genéricas ahora que tenemos Identity, Catalog, Cart, Ordering y Payment reconciliados?