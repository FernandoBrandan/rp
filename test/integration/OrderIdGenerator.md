# OrderIdGenerator — necesita Redis

Este requiere un Testcontainers de Redis en vez de Postgres.

npm install --save-dev @testcontainers/redis

test/integration/03order/order-id-generator.spec.ts

```ts
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';
import { OrderIdGenerator } from '@order/infra/services/order-id-generator.service';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('OrderIdGenerator (integration)', () => {
  let container: StartedRedisContainer;
  let redis: Redis;
  let generator: OrderIdGenerator;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    redis = new Redis({
      host: container.getHost(),
      port: container.getMappedPort(6379),
    });
    generator = new OrderIdGenerator(redis, makeLogger() as any);
  }, 60_000);

  beforeEach(async () => {
    await redis.flushall();
  });

  afterAll(async () => {
    await redis.quit();
    await container.stop();
  });

  it('genera IDs con formato ORDER-YYYYMMDD-XXXX', async () => {
    const id = await generator.generate();

    expect(id).toMatch(/^ORDER-\d{8}-\d{4}$/);
  });

  it('incrementa la secuencia', async () => {
    const id1 = await generator.generate();
    const id2 = await generator.generate();

    const seq1 = Number(id1.split('-')[2]);
    const seq2 = Number(id2.split('-')[2]);

    expect(seq2).toBe(seq1 + 1);
  });

  it('usa el mismo prefijo de fecha para todos los IDs del día', async () => {
    const id1 = await generator.generate();
    const id2 = await generator.generate();

    const date1 = id1.split('-')[1];
    const date2 = id2.split('-')[1];

    expect(date1).toBe(date2);
  });

  it('cae al fallback si Redis falla', async () => {
    await redis.quit(); // matamos la conexión

    const id = await generator.generate();

    // El fallback no usa 4 dígitos, usa timestamp+random
    expect(id).toMatch(/^ORDER-\d{8}-/);
    expect(id).not.toMatch(/^ORDER-\d{8}-\d{4}$/);
  });
});
```

Ojo: el test "cae al fallback" rompe la conexión a Redis, y por eso está al final. Si lo corrés primero, los demás tests fallan porque Redis ya no responde. El orden importa cuando un test tiene efectos colaterales sobre el entorno compartido.

Si querés que sea prolijo, podés usar beforeEach para recrear la conexión, pero es más complejo. Para MVP, dejalo al final.

---

2. OrderIdGenerator con Redis (cierra integración)

Es lo único que quedó sin testear en la capa de integración. 30 minutos, patrón conocido (mismo que TestDatabase pero con RedisContainer).

Por qué importa: el OrderIdGenerator tiene un try/catch con fallback. Si Redis se cae, genera un ID alternativo. Eso es lógica no trivial que hoy no está verificada.

Costo: bajo. Beneficio: cierra la capa de integración con 100%.

un bug real en el código

Cuando pases por OrderPaidListener, miralo:

```ts
async handle(event: OrderPaidEvent) {
  const order = await this.orderRepository.getOrderDetail(event.orderId);
  if (order) {
    order.pay();                            // ← primero
    await this.orderRepository.update(order);
  }
  if (order?.reservationId) {
    await this.stockService.confirmReservation(order.reservationId);  // ← después
  }
}
```

Si confirmReservation falla, la orden queda PAID en la DB pero la reserva no está confirmada. Queda inconsistente.

Fix: invertir el orden. Confirmar la reserva primero, y solo si eso pasa, marcar la orden como PAID. Es un cambio de 5 líneas.

No es urgente (los tests pasan, es un caso raro), pero es el tipo de cosa que documentás como ADR y arreglás en algún momento. Si querés lo hacemos ahora, es rápido.
