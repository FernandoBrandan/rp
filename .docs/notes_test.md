# Estrategia de testing por carpeta

Regla general: **el testing sigue el valor, no la simetría**.
No todo merece test.
La pirámide clásica (muchos unit, algunos integration, pocos e2e) aplica perfecto a tu arquitectura.

---

## Por capa — qué testear y cómo

### `domain/` — **muchos unit tests** ✅

Es la capa de mayor valor por test.
Sin dependencias externas (excepto `TypeORM` en `orm-entity.ts`, pero eso es infra encubierto).

| Carpeta                                                        | ¿Testear?              | Tipo |
| -------------------------------------------------------------- | ---------------------- | ---- |
| `domain/*.entity.ts` (`Order`, `Product`, `Cart`)              | **Sí, prioridad alta** | Unit |
| `domain/value-objects/*.vo.ts` (`Money`, `Serial`, `CartItem`) | **Sí, prioridad alta** | Unit |

---

### `application/` — **tests selectivos** ⚠️

| Carpeta                               | ¿Testear?              | Tipo                       |
| ------------------------------------- | ---------------------- | -------------------------- |
| `application/use-cases/*.use-case.ts` | **Sí, prioridad alta** | Unit (con repos mockeados) |
| `application/listeners/*.listener.ts` | **Sí**                 | Unit                       |

---

### `infra/` — **integración + e2e** ⚠️

| Carpeta                                                 | ¿Testear?           | Tipo                                                        |
| ------------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| `infra/repositories/*.repository.ts`                    | **Sí, integración** | Integration con DB real (Testcontainers o sqlite in-memory) |
| `infra/adapters/*.adapter.ts`                           | **Sí, integración** | Integration (o unit si la lógica es simple)                 |
| `infra/persistence/*.orm-mapper.ts`                     | **Sí, unit**        | Unit (son transformaciones puras)                           |
| `infra/services/*.service.ts` (`OrderIdGenerator`)      | **Sí**              | Unit con Redis mockeado                                     |
| `infra/providers/*.provider.ts` (`FakePaymentProvider`) | **Sí, unit**        | Unit (valida delay, emisión de eventos)                     |

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

| Carpeta                        | ¿Testear? | Tipo                |
| ------------------------------ | --------- | ------------------- |
| `presentation/*.controller.ts` | **Sí**    | E2E con `supertest` |

Los controllers deben ser **delgados** (routing + delegar). Si son delgados, un e2e por controller alcanza.

**Qué testear**:

- Cada endpoint devuelve el status esperado
- Validación del body (400 con class-validator)
- Un happy path por operación

**Ya tenés** el `smoke-test.sh` que cubre el flujo completo.
Migralo a Jest+supertest cuando quieras CI.
Los tests por controller deben ser pocos y rápidos.

---

## `common/` — **sí, poco**

| Carpeta                                   | ¿Testear?    | Tipo                              |
| ----------------------------------------- | ------------ | --------------------------------- |
| `common/filters/*.filter.ts`              | **Sí, unit** | Unit con mocks de `ArgumentsHost` |
| `common/domain/value-objects/money.vo.ts` | **Sí, unit** | Unit (es un VO real)              |

El filter es el único con lógica. Testeás que:

- `InfrastructureException` → 503
- `HttpException` → status correspondiente
- `Error` genérico → 500

---

## `infra/` (top-level) — **selectivo**

| Carpeta                                     | ¿Testear?           | Tipo                                                    |
| ------------------------------------------- | ------------------- | ------------------------------------------------------- |
| `infra/logger/logger.ts`                    | **Sí, unit**        | Unit (verificar correlation ID desde AsyncLocalStorage) |
| `infra/logger/correlation-id.middleware.ts` | **Sí, unit**        | Unit con mock de req/res                                |
| `infra/redis/redis.service.ts`              | **Sí, integración** | Integration con Redis real                              |
| `infra/health/*`                            | **Sí, e2e**         | E2E (`GET /health`)                                     |

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

| Capa                        | Cobertura objetivo     | Por qué                              |
| --------------------------- | ---------------------- | ------------------------------------ |
| `domain/`                   | **90–100%**            | Es puro, sin excusas para no testear |
| `application/use-cases/`    | **80–90%**             | Es la orquestación, mucho valor      |
| `application/listeners/`    | **70–80%**             | Importante pero más simple           |
| `infra/repositories/`       | **60–70%**             | Integration, lento, menos casos      |
| `infra/adapters/`           | **70%**                | Integration, cada método             |
| `presentation/controllers/` | **1 e2e por endpoint** | No cobertura %, sí flujo             |
| `common/`                   | **80%**                | Solo filters y VOs                   |
| **Global**                  | **70–80%**             | Es un objetivo sano, no una obsesión |

**No persigas 100%**: los getters, los DTOs, los enums, y los wrappers triviales no aportan.
La cobertura es una métrica de vanidad si la usás como objetivo.

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

> **Dentro de cada módulo con DDD hexagonal, a qué carpetas hacer test y qué tipo.**

| Carpeta                             | Sí/No                | Tipo         |
| ----------------------------------- | -------------------- | ------------ |
| `domain/*.entity.ts`                | Sí                   | Unit         |
| `domain/value-objects/*.vo.ts`      | Sí                   | Unit         |
| `domain/enums/*`                    | No                   | —            |
| `domain/repositories/*`             | No                   | —            |
| `application/use-cases/*`           | Sí                   | Unit (mocks) |
| `application/listeners/*`           | Sí                   | Unit (mocks) |
| `application/mappers/*`             | Sí, si tienen lógica | Unit         |
| `application/ports/*`               | No                   | —            |
| `application/dto/*`                 | No                   | —            |
| `infra/repositories/*`              | Sí                   | Integration  |
| `infra/adapters/*`                  | Sí                   | Integration  |
| `infra/persistence/*.orm-mapper.ts` | Sí                   | Unit         |
| `infra/persistence/*.orm-entity.ts` | No                   | —            |
| `infra/services/*`                  | Sí                   | Unit         |
| `infra/providers/*`                 | Sí                   | Unit         |
| `presentation/*.controller.ts`      | Sí                   | E2E          |

Arrancá por `domain/`, seguí con `application/use-cases/`, después `infra/repositories/`. Con eso cubrís el 90% del valor.

## Estructura

### test unitario

````ts
describe('NombreDeLaClase', () => {
  it('describe qué debería pasar', () => {
    // Arrange  → preparo datos
    const money = new Money(100);

    // Act      → ejecuto la acción
    const result = money.add(new Money(50));

    // Assert   → verifico el resultado
    expect(result.getValue()).toBe(150);
  });
});
```s
````

| Matcher                               | Sirve para                                   |
| ------------------------------------- | -------------------------------------------- |
| expect(x).toBe(valor)                 | comparar primitivos: string, number, boolean |
| expect(x).toEqual(valor)              | comparar objetos/arrays                      |
| expect(x).toThrow('mensaje')          | verificar que lanza error                    |
| expect(x).toHaveLength(n)             | longitud de array                            |
| expect(x).toBeUndefined()             | verificar undefined                          |
| ------------------------------------- | -------------------------------------------- |
| expect(x).toBe(5)                     | igualdad estricta (primitivos)               |
| expect(x).toEqual({ a: 1 })           | igualdad estructural (objetos)               |
| expect(() => fn()).toThrow('mensaje') | que lance error                              |
| expect(x).toHaveLength(3)             | longitud                                     |
| expect(x).toBeUndefined()             | undefined                                    |
| expect(x).toBeNull()                  | null                                         |
| expect(x).toBeTruthy() / .toBeFalsy() | truthy / falsy                               |
| expect(arr).toContsain('algo')        | array contiene                               |
|                                       |                                              |
| ------------------------------------- | -------------------------------------------- |

- Tests de integración con DB real (Testcontainers o pg-mem).
  Ahí se prueban los repositorios TypeORM. Ojo: pg-mem es más rápido pero tiene limitaciones (no soporta enum de Postgres, por ejemplo). Testcontainers es más fiel.

- E2E con supertest — el flujo completo:
  POST /products → POST /cart → POST /orders → POST /payments/webhook → GET /orders/:id debe estar PAID.

- Fake timers avanzados — hay un test que todavía no escribimos y que es interesante: verificar que un webhook duplicado no rompe (la orden ya está PAID, otro webhook llega). Y el test de race condition con la idempotencyKey.

## Parte 1 — Consigna: "Agregar efectos secundarios a los primeros tests"

### Objetivo

Los 3 tests originales de `catalog` (`get-product`, `list-products`, `create-product`) cubren camino feliz + errores esperados.
**No cubren efectos secundarios**: llamadas al logger, qué se pasó a `save`, si se llamó o no a un método.

La consigna es: **agregar tests que verifiquen el "cómo", no solo el "qué"**.

### Qué probar en cada uno

| Use case               | Efecto a verificar                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GetProductUseCase`    | `logger.info` llamado con `{ serial }` en el happy path. <br>`logger.warn` llamado cuando no encuentra.                                           |
| `ListProductsUseCase`  | `logger.info` llamado al ejecutar.                                                                                                                |
| `CreateProductUseCase` | `logger.info` llamado al crear. <br>`save` recibió un `Product` con el serial correcto. <br>`save` **no** se llamó cuando el serial era inválido. |

### Cómo verificar que ya está completo

- Cada use case tiene al menos **un test extra** que hace `expect(logger.X).toHaveBeenCalledWith(...)`.
- En `CreateProductUseCase`, hay un test que accede a `repo.save.mock.calls[0][0]` y verifica el contenido del `Product` guardado.
- `npm test` sigue todo en verde.

### Archivos a tocar

```
test/unit/01catalog/get-product.use-case.spec.ts
test/unit/01catalog/list-products.use-case.spec.ts
test/unit/01catalog/create-product.use-case.spec.ts
```

---

## Parte 2 — Notas para retomar otro día

### Lo que tenés

- 20 suites, 85 tests pasando (después de arreglar el de `InsufficientStock`).
- Cobertura de dominio completa: entidades + VOs.
- Cobertura de aplicación casi completa: use cases, listeners, providers.
- Patrones que ya usás sin pensar:
  - `jest.fn()` + `.mockResolvedValue()` / `.mockRejectedValue()`
  - `expect(promise).rejects.toThrow()`
  - `toHaveBeenCalledWith`, `not.toHaveBeenCalled`
  - `expect.objectContaining()`, `expect.anything()`
  - `jest.useFakeTimers()` + `advanceTimersByTime()`
  - Factories (`makeLogger`, `makeDeps`, `makeProduct`)

### Lo que te falta para la consigna

**Para `GetProductUseCase`:**

```ts
it('loguea info con el serial al ejecutar', async () => {
  const product = makeProduct();
  const repo = { findBySerial: jest.fn().mockResolvedValue(product) };
  const logger = makeLogger(); // ← necesitás pasar el logger, no crearlo inline
  const useCase = new GetProductUseCase(repo as any, logger);

  await useCase.execute('PROD-000001');

  expect(logger.info).toHaveBeenCalledWith('Getting product', {
    serial: 'PROD-000001',
  });
});
```

**Nota clave**: hoy en varios tests pasás `makeLogger()` inline. Para verificar el logger, tenés que guardarlo en una variable:

```ts
// ❌ hoy
const useCase = new GetProductUseCase(repo as any, makeLogger());

// ✅ para verificar efectos
const logger = makeLogger();
const useCase = new GetProductUseCase(repo as any, logger);
expect(logger.info).toHaveBeenCalledWith(...);
```

**Para `CreateProductUseCase` (verificar el contenido de `save`):**

```ts
it('guarda un Product con el serial correcto', async () => {
  const repo = { save: jest.fn().mockResolvedValue(undefined) };
  const useCase = new CreateProductUseCase(repo as any, makeLogger());

  await useCase.execute({
    serial: 'PROD-000001',
    name: 'Laptop',
    price: 100,
    stock: 10,
  });

  const savedProduct = repo.save.mock.calls[0][0] as Product;
  expect(savedProduct.serial.getValue()).toBe('PROD-000001');
  expect(savedProduct.name).toBe('Laptop');
  expect(savedProduct.stock).toBe(10);
});
```

**El método mágico**: `mock.calls[0][0]` te da el primer argumento de la primera llamada al mock. Con eso accedés al objeto que se intentó guardar.

### Lo que NO hay que hacer

- No cambies el código de producción para que el test sea más fácil.
- No uses `expect.anything()` cuando podés verificar el valor exacto.
- No verifiques **todo** en cada test. Un test = una idea. Si querés verificar logger y save, son dos tests.

### Checklist de cierre

```
□ get-product.spec.ts tiene test de logger.info en happy path
□ get-product.spec.ts tiene test de logger.warn cuando no encuentra
□ list-products.spec.ts tiene test de logger.info
□ create-product.spec.ts tiene test de logger.info al crear
□ create-product.spec.ts verifica contenido de save con mock.calls
□ npm test → todo verde
```

# Test integracion

npx jest test/integration --runInBand
