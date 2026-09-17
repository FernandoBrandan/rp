import { BadRequestException, ConflictException } from '@nestjs/common';

import { CreateProductUseCase } from '@catalog/application/use-cases/create-product.use-case';
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

describe('CreateProductUseCase', () => {
  it('crea un producto válido y lo guarda', async () => {
    const repo = { save: jest.fn().mockResolvedValue(undefined) };
    const useCase = new CreateProductUseCase(repo as any, makeLogger());

    const result = await useCase.execute({
      serial: 'PROD-000001',
      name: 'Laptop',
      price: 100,
      stock: 10,
    });

    expect(result.serial).toBe('PROD-000001');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('rechaza un serial que no empieza con PROD-', async () => {
    const repo = { save: jest.fn() };
    const useCase = new CreateProductUseCase(repo as any, makeLogger());

    await expect(
      useCase.execute({
        serial: 'XYZ-123',
        name: 'Laptop',
        price: 100,
        stock: 10,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(repo.save).not.toHaveBeenCalled(); // ← nunca debe llegar a guardar
  });

  it('lanza ConflictException si el serial ya existe (23505)', async () => {
    const repo = {
      save: jest.fn().mockRejectedValue({ code: '23505' }),
    };
    const useCase = new CreateProductUseCase(repo as any, makeLogger());

    await expect(
      useCase.execute({
        serial: 'PROD-000001',
        name: 'Laptop',
        price: 100,
        stock: 10,
      }),
    ).rejects.toThrow(ConflictException);
  });
});
