import { BadRequestException, NotFoundException } from '@nestjs/common';

import { AddToCartUseCase } from '@cart/application/use-cases/add-to-cart.use-case';
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

function makeRepo(cart: Cart | null = null) {
  return {
    getCart: jest.fn().mockResolvedValue(cart),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
  };
}

describe('AddToCartUseCase', () => {
  it('crea un carrito nuevo y agrega el item', async () => {
    const repo = makeRepo(null);
    const checker = makeChecker(true);
    const useCase = new AddToCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    await useCase.execute('user-1', {
      item: { productId: 'prod-1', quantity: 2 },
    });

    expect(repo.save).toHaveBeenCalledTimes(1);
    const savedCart = repo.save.mock.calls[0][0] as Cart;
    expect(savedCart.userId).toBe('user-1');
    expect(savedCart.items).toHaveLength(1);
  });

  it('agrega a un carrito existente', async () => {
    const existing = new Cart('user-1', [new CartItem('prod-0', 1)]);
    const repo = makeRepo(existing);
    const checker = makeChecker(true);
    const useCase = new AddToCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    await useCase.execute('user-1', {
      item: { productId: 'prod-1', quantity: 2 },
    });

    expect(existing.items).toHaveLength(2);
  });

  it('lanza NotFoundException si el producto no existe', async () => {
    const repo = makeRepo(null);
    const checker = makeChecker(false, 'PRODUCT_NOT_FOUND');
    const useCase = new AddToCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    await expect(
      useCase.execute('user-1', { item: { productId: 'x', quantity: 1 } }),
    ).rejects.toThrow(NotFoundException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  it('lanza BadRequestException si el producto está INACTIVE', async () => {
    const repo = makeRepo(null);
    const checker = makeChecker(false, 'PRODUCT_INACTIVE');
    const useCase = new AddToCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    await expect(
      useCase.execute('user-1', { item: { productId: 'x', quantity: 1 } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza BadRequestException si no hay stock suficiente', async () => {
    const repo = makeRepo(null);
    const checker = makeChecker(false, 'INSUFFICIENT_STOCK');
    const useCase = new AddToCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    await expect(
      useCase.execute('user-1', { item: { productId: 'x', quantity: 1000 } }),
    ).rejects.toThrow(BadRequestException);
  });
});
