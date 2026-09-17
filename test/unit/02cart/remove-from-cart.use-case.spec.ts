import { NotFoundException } from '@nestjs/common';

import { RemoveFromCartUseCase } from '@cart/application/use-cases/remove-from-cart.use-case';
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

describe('RemoveFromCartUseCase', () => {
  it('lanza NotFoundException si no hay carrito', async () => {
    const repo = {
      getCart: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    const useCase = new RemoveFromCartUseCase(repo as any, makeLogger());

    await expect(useCase.execute('user-1', 'prod-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('remueve un producto del carrito', async () => {
    const cart = new Cart('user-1', [
      new CartItem('prod-1', 2),
      new CartItem('prod-2', 1),
    ]);
    const repo = {
      getCart: jest.fn().mockResolvedValue(cart),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new RemoveFromCartUseCase(repo as any, makeLogger());

    await useCase.execute('user-1', 'prod-1');

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].productId).toBe('prod-2');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('propaga el error si el item no existe en el carrito', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);
    const repo = {
      getCart: jest.fn().mockResolvedValue(cart),
      save: jest.fn(),
    };
    const useCase = new RemoveFromCartUseCase(repo as any, makeLogger());

    await expect(useCase.execute('user-1', 'prod-999')).rejects.toThrow(
      'Item not found',
    );
  });
});
