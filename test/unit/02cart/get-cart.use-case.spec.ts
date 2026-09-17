import { GetCartUseCase } from '@cart/application/use-cases/get-cart.use-case';
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

describe('GetCartUseCase', () => {
  it('devuelve un carrito vacío si el usuario no tiene carrito', async () => {
    const repo = { getCart: jest.fn().mockResolvedValue(null) };
    const checker = { getDetails: jest.fn() };
    const useCase = new GetCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    const result = await useCase.execute('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });

  it('enriquece items con nombre, precio y subtotal', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);
    const repo = { getCart: jest.fn().mockResolvedValue(cart) };
    const checker = {
      getDetails: jest.fn().mockResolvedValue({
        name: 'Laptop',
        price: 100,
        status: 'ACTIVE',
        stock: 10,
      }),
    };
    const useCase = new GetCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    const result = await useCase.execute('user-1');

    expect(result.items[0].name).toBe('Laptop');
    expect(result.items[0].price).toBe(100);
    expect(result.items[0].subtotal).toBe(200);
    expect(result.totalPrice).toBe(200);
  });

  it('usa "Producto no disponible" si el producto ya no existe', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);
    const repo = { getCart: jest.fn().mockResolvedValue(cart) };
    const checker = { getDetails: jest.fn().mockResolvedValue(null) };
    const useCase = new GetCartUseCase(
      repo as any,
      checker as any,
      makeLogger(),
    );

    const result = await useCase.execute('user-1');

    expect(result.items[0].name).toBe('Producto no disponible');
    expect(result.items[0].price).toBe(0);
    expect(result.items[0].subtotal).toBe(0);
  });
});
