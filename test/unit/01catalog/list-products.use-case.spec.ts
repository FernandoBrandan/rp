import { ListProductsUseCase } from '@catalog/application/use-cases/list-products.use-case';
import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

import { Money } from '@common/domain/value-objects/money.vo';

// ─── Helpers ────────────────────────────────────────────────────────
function makeProduct(): Product {
  return new Product(
    'prod-1',
    new Serial('PROD-000001'),
    'Laptop',
    new Money(100),
    10,
    ProductStatus.ACTIVE,
  );
}

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('ListProductsUseCase', () => {
  it('devuelve un array vacío si no hay productos', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([]) };
    const useCase = new ListProductsUseCase(repo as any, makeLogger());

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('mapea cada producto al DTO de respuesta', async () => {
    const products = [makeProduct(), makeProduct()];
    const repo = { findAll: jest.fn().mockResolvedValue(products) };
    const useCase = new ListProductsUseCase(repo as any, makeLogger());

    const result = await useCase.execute();

    expect(result).toHaveLength(2);
    expect(result[0].serial).toBe('PROD-000001');
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('price');
    expect(result[0]).toHaveProperty('status');
  });
});
