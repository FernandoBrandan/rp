import { BadRequestException, NotFoundException } from '@nestjs/common';

import { UpdateQuantityUseCase } from '@cart/application/use-cases/update-quantity.use-case';
import { Cart } from '@cart/domain/cart.entity';
import { CartItem } from '@cart/domain/value-objects/cartItem.vo';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeChecker(isValid: boolean, reason?: string) {
  return {
    validateAvailability: jest.fn().mockResolvedValue({ isValid, reason }),
    getDetails: jest.fn(),
  };
}

describe('UpdateQuantityUseCase', () => {
  it('actualiza la cantidad de un item', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);
    const repo = {
      getCart: jest.fn().mockResolvedValue(cart),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateQuantityUseCase(
      repo as any,
      makeChecker(true),
      makeLogger(),
    );

    await useCase.execute('user-1', { productId: 'prod-1', quantity: 5 });

    expect(cart.items[0].quantity).toBe(5);
  });

  it('lanza BadRequestException si no hay stock', async () => {
    const repo = { getCart: jest.fn(), save: jest.fn() };
    const useCase = new UpdateQuantityUseCase(
      repo as any,
      makeChecker(false, 'INSUFFICIENT_STOCK'),
      makeLogger(),
    );

    await expect(
      useCase.execute('user-1', { productId: 'prod-1', quantity: 1000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza NotFoundException si no hay carrito', async () => {
    const repo = {
      getCart: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const useCase = new UpdateQuantityUseCase(
      repo as any,
      makeChecker(true),
      makeLogger(),
    );

    await expect(
      useCase.execute('user-1', { productId: 'prod-1', quantity: 5 }),
    ).rejects.toThrow(NotFoundException);
  });
});
