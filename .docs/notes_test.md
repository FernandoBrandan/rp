# Estrategia de testing por carpeta

Regla general: **el testing sigue el valor, no la simetría**. 
No todo merece test. 
La pirámide clásica (muchos unit, algunos integration, pocos e2e) aplica perfecto a tu arquitectura.

---

## Por capa — qué testear y cómo

### `domain/` — **muchos unit tests** ✅

Es la capa de mayor valor por test. 
Sin dependencias externas (excepto `TypeORM` en `orm-entity.ts`, pero eso es infra encubierto).

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `domain/*.entity.ts` (`Order`, `Product`, `Cart`) | **Sí, prioridad alta** | Unit |
| `domain/value-objects/*.vo.ts` (`Money`, `Serial`, `CartItem`) | **Sí, prioridad alta** | Unit |
| `domain/enums/*.enum.ts` | No | — |
| `domain/repositories/*.repository.ts` | No (son interfaces) | — |

**Qué testear en entidades**:
- Invariantes (`Order.create` sin items → throw)
- Transiciones válidas (`pay()` desde PENDING funciona, desde FAILED no)
- Transiciones inválidas (`markPaymentFailed()` después de `READY` → throw)
- Cálculos derivados (`OrderItem.subtotal()`, `Order.total`)

**Qué testear en VOs**:
- Validaciones del constructor (`new Money(-1)` → throw)
- Inmutabilidad (`withQuantity` devuelve nueva instancia)
- Métodos (`add`, `multiply`, `subtotal`)

**Ejemplo** `order.entity.spec.ts`:
```ts
describe('Order', () => {
  it('no permite crear sin items', () => {
    expect(() => Order.create({ ..., items: [] })).toThrow();
  });
  it('pay() solo desde PENDING o WAITING_PAYMENT', () => {
    const order = makeOrder({ status: OrderStatus.PAID });
    // ...
  });
});
```

---

### `application/` — **tests selectivos** ⚠️

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `application/use-cases/*.use-case.ts` | **Sí, prioridad alta** | Unit (con repos mockeados) |
| `application/mappers/*.mapper.ts` | A veces | Unit |
| `application/dto/request/*.dto.ts` | No directo | (cubierto por e2e + validación) |
| `application/dto/response/*.dto.ts` | No | — |
| `application/listeners/*.listener.ts` | **Sí** | Unit |
| `application/ports/*.port.ts` | No (interfaces) | — |

**Qué testear en use-cases**:
- Happy path con mocks (repo + ports)
- Cada `throw` esperado (NotFoundException, ConflictException, BadRequestException)
- Casos borde: idempotencia, race condition

**Ejemplo** `create-order.use-case.spec.ts`:
```ts
const mockOrderRepo = { findByIdempotencyKey: jest.fn(), createOrder: jest.fn(), ... };
const mockStockService = { reserveStock: jest.fn(), releaseReservation: jest.fn() };

it('devuelve la orden existente si idempotencyKey ya existe', async () => {
  mockOrderRepo.findByIdempotencyKey.mockResolvedValue(existingOrder);
  const result = await useCase.execute(dto);
  expect(result.id).toBe(existingOrder.id);
  expect(mockOrderRepo.createOrder).not.toHaveBeenCalled();
});

it('libera reserva si createOrder falla', async () => {
  mockOrderRepo.createOrder.mockRejectedValue(new Error('DB down'));
  await expect(useCase.execute(dto)).rejects.toThrow();
  expect(mockStockService.releaseReservation).toHaveBeenCalled();
});
```

**Qué testear en listeners**:
- Que llaman al use-case/adapter correcto
- Que emiten el evento siguiente
- Que el `catch` emite el fallo

**Mappers**: testear solo si tienen lógica condicional (`statusMap`, ternarios). Si son transformaciones 1:1, no vale la pena.

---

### `infra/` — **integración + e2e** ⚠️

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `infra/repositories/*.repository.ts` | **Sí, integración** | Integration con DB real (Testcontainers o sqlite in-memory) |
| `infra/adapters/*.adapter.ts` | **Sí, integración** | Integration (o unit si la lógica es simple) |
| `infra/persistence/*.orm-mapper.ts` | **Sí, unit** | Unit (son transformaciones puras) |
| `infra/persistence/*.orm-entity.ts` | No | — |
| `infra/services/*.service.ts` (`OrderIdGenerator`) | **Sí** | Unit con Redis mockeado |
| `infra/providers/*.provider.ts` (`FakePaymentProvider`) | **Sí, unit** | Unit (valida delay, emisión de eventos) |

**Qué testear en repositorios (integración)**:
- `save()` persiste correctamente
- `findById()` retorna entidad de dominio (no ORM entity)
- `handleConnectionError` mapea correctamente ECONNREFUSED → `InfrastructureException`
- Constraints de DB (unique idempotencyKey)

**Setup**: `Testcontainers` (Postgres real en Docker) es lo más fiel. Alternativa: `pg-mem` (in-memory). Testcontainers es más lento pero no miente.

**Qué testear en adapters**:
- `ProductCheckerAdapter.validateAvailability`: producto inexistente / inactivo / stock insuficiente / ok
- `StockReservationAdapter`: reserva con stock OK, reserva sin stock, confirm, release — todos con DB real (integración)

**Qué testear en `FakePaymentProvider`**:
- Devuelve URL correcta
- Emite `ORDER_PAID` después del delay (usá `jest.useFakeTimers()`)
- Con `outcome: 'failed'` emite `ORDER_PAYMENT_FAILED`

**Qué NO testear**: las queries puras sin lógica (`findAll()` sin filtros). Lo cubre el e2e.

---

### `presentation/` — **e2e** ✅

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `presentation/*.controller.ts` | **Sí** | E2E con `supertest` |

Los controllers deben ser **delgados** (routing + delegar). Si son delgados, un e2e por controller alcanza.

**Qué testear**:
- Cada endpoint devuelve el status esperado
- Validación del body (400 con class-validator)
- Un happy path por operación

**Ya tenés** el `smoke-test.sh` que cubre el flujo completo. Migralo a Jest+supertest cuando quieras CI. Los tests por controller deben ser pocos y rápidos.

---

## `common/` — **sí, poco**

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `common/events/*.event.ts` | No (son DTOs) | — |
| `common/events/event-names.ts` | No | — |
| `common/exceptions/*.exception.ts` | No (son clases vacías) | — |
| `common/filters/*.filter.ts` | **Sí, unit** | Unit con mocks de `ArgumentsHost` |
| `common/domain/value-objects/money.vo.ts` | **Sí, unit** | Unit (es un VO real) |

El filter es el único con lógica. Testeás que:
- `InfrastructureException` → 503
- `HttpException` → status correspondiente
- `Error` genérico → 500

---

## `infra/` (top-level) — **selectivo**

| Carpeta | ¿Testear? | Tipo |
|---|---|---|
| `infra/logger/logger.ts` | **Sí, unit** | Unit (verificar correlation ID desde AsyncLocalStorage) |
| `infra/logger/correlation-id.middleware.ts` | **Sí, unit** | Unit con mock de req/res |
| `infra/logger/logging.interceptor.ts` | Poco | (cubierto por e2e) |
| `infra/redis/redis.service.ts` | **Sí, integración** | Integration con Redis real |
| `infra/database/database.module.ts` | No | — |
| `infra/health/*` | **Sí, e2e** | E2E (`GET /health`) |
| `infra/tokens/*` | No | — |

---

## Resumen visual

```
┌─────────────────────────────────────────────────────────────┐
│ E2E (pocos, lentos, alto valor)                             │
│   → presentation/*.controller.ts (supertest)                │
│   → flujo completo (ya lo tenés en smoke-test.sh)           │
└─────────────────────────────────────────────────────────────┘
         ▲
┌─────────────────────────────────────────────────────────────┐
│ Integration (medianos, DB/Redis reales)                     │
│   → infra/repositories/*.ts                                 │
│   → infra/adapters/*.ts                                     │
│   → infra/redis/redis.service.ts                            │
└─────────────────────────────────────────────────────────────┘
         ▲
┌─────────────────────────────────────────────────────────────┐
│ Unit (muchos, rápidos, alto valor)                          │
│   → domain/**/*.entity.ts                                   │
│   → domain/**/*.vo.ts                                       │
│   → application/**/*.use-case.ts                            │
│   → application/**/*.listener.ts                            │
│   → application/**/*.mapper.ts (si tiene lógica)            │
│   → infra/persistence/*.orm-mapper.ts                       │
│   → infra/services/*.service.ts                             │
│   → infra/providers/*.provider.ts                           │
│   → common/filters/*.filter.ts                              │
│   → common/domain/**/*.vo.ts                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Cobertura — objetivos realistas

| Capa | Cobertura objetivo | Por qué |
|---|---|---|
| `domain/` | **90–100%** | Es puro, sin excusas para no testear |
| `application/use-cases/` | **80–90%** | Es la orquestación, mucho valor |
| `application/listeners/` | **70–80%** | Importante pero más simple |
| `infra/repositories/` | **60–70%** | Integration, lento, menos casos |
| `infra/adapters/` | **70%** | Integration, cada método |
| `presentation/controllers/` | **1 e2e por endpoint** | No cobertura %, sí flujo |
| `common/` | **80%** | Solo filters y VOs |
| **Global** | **70–80%** | Es un objetivo sano, no una obsesión |

**No persigas 100%**: los getters, los DTOs, los enums, y los wrappers triviales no aportan. La cobertura es una métrica de vanidad si la usás como objetivo.

---

## Estructura de archivos sugerida

Cada `*.spec.ts` **al lado** del archivo que testea (convención NestJS):

```
01catalog/
├── domain/
│   ├── product.entity.ts
│   ├── product.entity.spec.ts           ← unit
│   └── value-objects/
│       ├── money.vo.ts  (ahora en common)
│       └── serial.vo.ts
│       └── serial.vo.spec.ts            ← unit
├── application/
│   ├── use-cases/
│   │   ├── create-product.use-case.ts
│   │   └── create-product.use-case.spec.ts   ← unit
│   └── listeners/
│       └── ...
├── infra/
│   ├── repositories/
│   │   ├── typeorm-product.repository.ts
│   │   └── typeorm-product.repository.spec.ts   ← integration
│   └── adapters/
│       ├── product-checker.adapter.ts
│       └── product-checker.adapter.spec.ts      ← integration
└── presentation/
    ├── catalog.controller.ts
    └── catalog.controller.e2e-spec.ts           ← e2e
```

- `.spec.ts` → unit e integration (rápidos)
- `.e2e-spec.ts` → e2e (levantan la app completa)

Configurá dos scripts en `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathIgnorePatterns=e2e-spec",
    "test:e2e": "jest --testPathPattern=e2e-spec",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
```

---

## Plan de adopción — orden sugerido

**Semana 1 — base sólida (mayor ROI)**:
1. `domain/` de `03order` (`Order`, `OrderItem`, `Money`) — el más rico en reglas
2. `domain/` de `01catalog` (`Product`, `Serial`)
3. `domain/` de `02cart` (`Cart`, `CartItem`)
4. `common/filters/infrastructure-exception.filter.spec.ts`

**Semana 2 — orquestación**:
5. `application/use-cases/` de `03order` (`CreateOrderUseCase` — es el más complejo)
6. `application/use-cases/` de `01catalog`
7. `application/use-cases/` de `02cart`
8. `application/listeners/` de los 3 módulos

**Semana 3 — infra real**:
9. `infra/repositories/` de los 3 módulos (integración con Testcontainers)
10. `infra/adapters/` de catalog (`ProductChecker`, `StockReservation`)

**Semana 4 — e2e**:
11. Migrar `smoke-test.sh` a Jest + supertest
12. Un e2e por controller

---

## Qué NO testear (anti-patrones)

- **Getters/setters triviales**: `product.name`, `order.id`. No aportan.
- **DTOs**: no tienen lógica. Los cubre el e2e.
- **Interfaces y tipos**: no existen en runtime.
- **Enums**: son constantes.
- **`event-names.ts`**: son strings.
- **`tokens/index.ts`**: son `Symbol()`.
- **ORM entities**: no tienen comportamiento (salvo que anotes `@BeforeInsert`, etc.).
- **Configuración de módulos**: `@Module({...})`. Si compila y bootea, está bien.
- **Frameworks de terceros**: no testeás `winston` ni `ioredis`. Testeás tu wrapper.

---

## Respuesta directa a tus preguntas

> **¿Debería testear infra y common?**

**Sí, pero selectivamente**:
- `infra/` → **integration tests** (repositorios, adapters), y algunos unit en `providers/` y `services/`.
- `common/` → **unit tests** solo en `filters/` y VOs compartidos. Nada más.

> **Dentro de cada módulo con DDD hexagonal, a qué carpetas hacer test y qué tipo.**

| Carpeta | Sí/No | Tipo |
|---|---|---|
| `domain/*.entity.ts` | Sí | Unit |
| `domain/value-objects/*.vo.ts` | Sí | Unit |
| `domain/enums/*` | No | — |
| `domain/repositories/*` | No | — |
| `application/use-cases/*` | Sí | Unit (mocks) |
| `application/listeners/*` | Sí | Unit (mocks) |
| `application/mappers/*` | Sí, si tienen lógica | Unit |
| `application/ports/*` | No | — |
| `application/dto/*` | No | — |
| `infra/repositories/*` | Sí | Integration |
| `infra/adapters/*` | Sí | Integration |
| `infra/persistence/*.orm-mapper.ts` | Sí | Unit |
| `infra/persistence/*.orm-entity.ts` | No | — |
| `infra/services/*` | Sí | Unit |
| `infra/providers/*` | Sí | Unit |
| `presentation/*.controller.ts` | Sí | E2E |

Arrancá por `domain/`, seguí con `application/use-cases/`, después `infra/repositories/`. Con eso cubrís el 90% del valor.

¿Querés que arranquemos con los primeros tests de `Order` (entity + VOs)? Es la mejor entrada porque las reglas de negocio están todas ahí y no necesitan ningún mock.
