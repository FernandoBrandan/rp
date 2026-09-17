import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'crypto';
import request = require('supertest');
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

describe('E2E — flujo completo', () => {
  let postgres: StartedPostgreSqlContainer;
  let redis: StartedRedisContainer;
  let app: INestApplication;

  // ─── Setup ──────────────────────────────────────────────────────
  beforeAll(async () => {
    // 1. Levantar containers
    postgres = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    redis = await new RedisContainer('redis:7-alpine').start();

    // 2. Setear env ANTES de importar AppModule
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';

    process.env.DB_HOST = postgres.getHost();
    process.env.DB_PORT = String(postgres.getMappedPort(5432));
    process.env.DB_USER = 'test';
    process.env.DB_PASS = 'test';
    process.env.DB_NAME = 'test';
    process.env.DB_LOGGING = 'false';

    process.env.REDIS_HOST = redis.getHost();
    process.env.REDIS_PORT = String(redis.getMappedPort(6379));

    process.env.PAYMENT_PROVIDER = 'fake';
    process.env.FAKE_PAYMENT_OUTCOME = 'approved';
    process.env.FAKE_PAYMENT_DELAY_MS = '200'; // ← corto para tests

    process.env.JWT_SECRET = 'test-secret-16-chars-min';
    process.env.JWT_EXPIRES_IN = '1d';

    process.env.LOG_LEVEL = 'error'; // ← silenciar logs
    process.env.SERVICE_NAME = 'ecommerce-api-test';

    // 3. Import dinámico — config.module.ts se evalúa ahora
    const { AppModule } = await import('../../src/app.module');
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
  }, 120_000); // ← 2 min: descarga de imagen + boot

  afterAll(async () => {
    if (app) await app.close();
    if (postgres) await postgres.stop();
    if (redis) await redis.stop();
  });

  // ─── Helper: esperar un estado de orden ─────────────────────────
  async function waitForOrderStatus(
    orderId: string,
    expected: string,
    timeoutMs = 5000,
  ): Promise<any> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const res = await request(app.getHttpServer()).get(`/orders/${orderId}`);
      if (res.status === 200 && res.body.status === expected) {
        return res.body;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(
      `Timeout: order ${orderId} no llegó a "${expected}" en ${timeoutMs}ms`,
    );
  }

  // ─── Test 1: happy path ─────────────────────────────────────────
  it('flujo completo: product → cart → order → payment → PAID', async () => {
    const serial = `PROD-E2E-${Date.now()}`;
    const userId = randomUUID();

    // 1. Crear producto
    const productRes = await request(app.getHttpServer())
      .post('/products')
      .send({ serial, name: 'Laptop E2E', price: 100, stock: 10 })
      .expect(201);

    expect(productRes.body.stock).toBe(10);
    const productId = productRes.body.id;

    // 2. Agregar al carrito
    await request(app.getHttpServer())
      .post(`/cart/${userId}`)
      .send({ item: { productId, quantity: 2 } })
      .expect(201);

    // 3. Verificar carrito enriquecido
    const cartRes = await request(app.getHttpServer())
      .get(`/cart/${userId}`)
      .expect(200);

    expect(cartRes.body.items).toHaveLength(1);
    expect(cartRes.body.totalItems).toBe(2);
    expect(cartRes.body.totalPrice).toBe(200);

    // 4. Crear orden
    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .send({
        userId,
        idempotencyKey: randomUUID(),
        items: [{ productId, quantity: 2, price: 100 }],
      })
      .expect(201);

    const orderId = orderRes.body.id;
    expect(orderRes.body.total).toBe(200);
    expect(orderRes.body.status).toBe('PENDING');

    // 5. El fake provider emite ORDER_PAID tras FAKE_PAYMENT_DELAY_MS
    const paidOrder = await waitForOrderStatus(orderId, 'PAID');

    expect(paidOrder.paymentUrl).toBeDefined();

    // 6. Verificar stock descontado (10 - 2)
    const afterRes = await request(app.getHttpServer())
      .get(`/products/${serial}`)
      .expect(200);

    expect(afterRes.body.stock).toBe(8);
  }, 30_000);

  // ─── Test 2: idempotencia ───────────────────────────────────────
  it('idempotencia: doble POST /orders con mismo key devuelve la misma orden', async () => {
    const serial = `PROD-E2E-${Date.now()}-IDEM`;
    const userId = randomUUID();

    const productRes = await request(app.getHttpServer())
      .post('/products')
      .send({ serial, name: 'Mouse', price: 50, stock: 10 })
      .expect(201);

    const productId = productRes.body.id;
    const idempotencyKey = randomUUID();
    const payload = {
      userId,
      idempotencyKey,
      items: [{ productId, quantity: 1, price: 50 }],
    };

    const first = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(201);

    // Esperar a que se complete el ciclo (para que el segundo POST no dé 202)
    await waitForOrderStatus(first.body.id, 'PAID');

    const second = await request(app.getHttpServer())
      .post('/orders')
      .send(payload)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    // El stock debe haber bajado SOLO una vez
    const after = await request(app.getHttpServer())
      .get(`/products/${serial}`)
      .expect(200);

    expect(after.body.stock).toBe(9); // 10 - 1, no 8
  }, 30_000);

  // ─── Test 3: stock insuficiente ─────────────────────────────────
  it('rechaza POST /orders si no hay stock suficiente', async () => {
    const serial = `PROD-E2E-${Date.now()}-LOW`;
    const userId = randomUUID();

    const productRes = await request(app.getHttpServer())
      .post('/products')
      .send({ serial, name: 'X', price: 100, stock: 1 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/orders')
      .send({
        userId,
        idempotencyKey: randomUUID(),
        items: [{ productId: productRes.body.id, quantity: 100, price: 100 }],
      })
      .expect(400);

    // El stock debe estar intacto
    const after = await request(app.getHttpServer())
      .get(`/products/${serial}`)
      .expect(200);

    expect(after.body.stock).toBe(1);
  }, 30_000);

  // ─── Test 4: producto inactivo ──────────────────────────────────
  it('rechaza agregar producto INACTIVE al carrito', async () => {
    const serial = `PROD-E2E-${Date.now()}-OFF`;
    const userId = randomUUID();

    const created = await request(app.getHttpServer())
      .post('/products')
      .send({ serial, name: 'X', price: 100, stock: 5 })
      .expect(201);

    // Desactivar
    await request(app.getHttpServer())
      .put('/products')
      .send({ serial, status: 'INACTIVE' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/cart/${userId}`)
      .send({ item: { productId: created.body.id, quantity: 1 } })
      .expect(400);
  }, 30_000);

  // ─── Test 5: orden inexistente ──────────────────────────────────
  it('GET /orders/:id devuelve 404 si no existe', async () => {
    await request(app.getHttpServer()).get('/orders/NO-EXISTE-123').expect(404);
  }, 10_000);
});
