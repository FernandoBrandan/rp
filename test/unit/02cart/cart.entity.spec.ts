import { Cart } from '@cart/domain/cart.entity';
import { CartItem } from '@cart/domain/value-objects/cartItem.vo';

describe('Cart', () => {
  it('agrega un item nuevo', () => {
    const cart = new Cart('user-1');

    cart.addItem(new CartItem('prod-1', 2));

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
  });

  it('suma cantidad si el producto ya existe', () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);

    cart.addItem(new CartItem('prod-1', 3));

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('removeItem elimina y falla si no existe', () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);

    cart.removeItem('prod-1');

    expect(cart.items).toHaveLength(0);
    expect(() => cart.removeItem('prod-2')).toThrow('Item not found');
  });

  it('updateQuantity cambia cantidad y falla si no existe', () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);

    cart.updateQuantity('prod-1', 5);

    expect(cart.items[0].quantity).toBe(5);
    expect(() => cart.updateQuantity('prod-2', 1)).toThrow('Item not found');
  });
});
