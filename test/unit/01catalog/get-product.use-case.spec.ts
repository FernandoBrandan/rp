import { NotFoundException } from '@nestjs/common';

import { GetProductUseCase } from '@catalog/application/use-cases/get-product.use-case';
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
describe('GetProductUseCase', () => {
  it('devuelve el producto si existe', async () => {
    // Arrange
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
    };
    const useCase = new GetProductUseCase(repo as any, makeLogger());

    // Act
    const result = await useCase.execute('PROD-000001');

    // Assert
    expect(result.serial).toBe('PROD-000001');
    expect(result.name).toBe('Laptop');
    expect(result.price).toBe(100);
    expect(result.stock).toBe(10);
  });

  it('llama al repositorio con el serial recibido', async () => {
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
    };
    const useCase = new GetProductUseCase(repo as any, makeLogger());

    await useCase.execute('PROD-000001');

    expect(repo.findBySerial).toHaveBeenCalledWith('PROD-000001');
  });

  it('lanza NotFoundException si el producto no existe', async () => {
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(null),
    };
    const useCase = new GetProductUseCase(repo as any, makeLogger());

    await expect(useCase.execute('PROD-999')).rejects.toThrow(
      NotFoundException,
    );
  });
});
