import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Cart Flow (e2e)', () => {
  let app: INestApplication;
  let createdProductId: string;
  const userId = 'user-test-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe()); // Para validar los DTOs
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Preparación: Crear Producto en Catálogo', () => {
    it('POST /products', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          serial: 'TEST-001',
          name: 'Producto de Prueba',
          price: 100,
          stock: 10,
        })
        .expect(201);

      createdProductId = response.body.id; // Guardamos el ID para el carrito
      expect(createdProductId).toBeDefined();
    });
  });

  describe('Flujo de Carrito', () => {
    it('POST /cart/:userId - Debería añadir el producto al carrito', async () => {
      const response = await request(app.getHttpServer())
        .post(`/cart/${userId}`)
        .send({
          item: {
            productId: createdProductId,
            quantity: 2,
          },
        })
        .expect(201);

      expect(response.body.userId).toBe(userId);
      expect(response.body.totalItems).toBe(2);
    });

    it('GET /cart/:userId - Debería retornar el carrito enriquecido con datos del catálogo', async () => {
      const response = await request(app.getHttpServer())
        .get(`/cart/${userId}`)
        .expect(200);

      expect(response.body.userId).toBe(userId);
      expect(response.body.items).toHaveLength(1);

      const item = response.body.items[0];
      expect(item.name).toBe('Producto de Prueba'); // Dato del catálogo
      expect(item.price).toBe(100);
      expect(item.subtotal).toBe(200);
      expect(response.body.totalPrice).toBe(200);
    });

    it('PUT /cart/:userId - Debería actualizar la cantidad', async () => {
      await request(app.getHttpServer())
        .put(`/cart/${userId}`)
        .send({
          productId: createdProductId,
          quantity: 5,
        })
        .expect(200);

      const getRes = await request(app.getHttpServer()).get(`/cart/${userId}`);
      expect(getRes.body.totalItems).toBe(5);
      expect(getRes.body.totalPrice).toBe(500);
    });

    it('DELETE /cart/:userId/:productId - Debería eliminar el producto', async () => {
      await request(app.getHttpServer())
        .delete(`/cart/${userId}/${createdProductId}`)
        .expect(200);

      const getRes = await request(app.getHttpServer()).get(`/cart/${userId}`);
      expect(getRes.body.items).toHaveLength(0);
      expect(getRes.body.totalPrice).toBe(0);
    });
  });

  describe('Validaciones de Reglas de Negocio', () => {
    it('POST /cart/:userId - Debería fallar si el producto no existe', async () => {
      const fakeId = 'ccbf4592-cdf3-4eb9-b24e-572cb9b196f1';
      await request(app.getHttpServer())
        .post(`/cart/${userId}`)
        .send({
          item: { productId: fakeId, quantity: 1 },
        })
        .expect(404); // NotFoundException
    });
  });
});
