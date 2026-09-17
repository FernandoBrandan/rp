import { NotFoundException } from '@nestjs/common';

import { UpdateProductUseCase } from '@catalog/application/use-cases/update-product.use-case';
import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

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

describe('UpdateProductUseCase', () => {
  it('lanza NotFoundException si el producto no existe', async () => {
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const useCase = new UpdateProductUseCase(repo as any, makeLogger());

    await expect(
      useCase.execute({ serial: 'PROD-999', name: 'X' }),
    ).rejects.toThrow(NotFoundException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('actualiza solo el name cuando se pasa name', async () => {
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateProductUseCase(repo as any, makeLogger());

    const result = await useCase.execute({
      serial: 'PROD-000001',
      name: 'Mouse',
    });

    expect(result.name).toBe('Mouse');
    expect(result.price).toBe(100); // no cambió
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('actualiza solo el price cuando se pasa price', async () => {
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateProductUseCase(repo as any, makeLogger());

    const result = await useCase.execute({ serial: 'PROD-000001', price: 250 });

    expect(result.price).toBe(250);
    expect(result.name).toBe('Laptop');
  });

  it('actualiza stock y status', async () => {
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateProductUseCase(repo as any, makeLogger());

    await useCase.execute({
      serial: 'PROD-000001',
      stock: 99,
      status: ProductStatus.INACTIVE,
    });

    expect(product.stock).toBe(99);
    expect(product.status).toBe(ProductStatus.INACTIVE);
  });

  it('no llama a save si no hay cambios', async () => {
    const product = makeProduct();
    const repo = {
      findBySerial: jest.fn().mockResolvedValue(product),
      save: jest.fn(),
    };
    const useCase = new UpdateProductUseCase(repo as any, makeLogger());

    await useCase.execute({ serial: 'PROD-000001' });

    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
