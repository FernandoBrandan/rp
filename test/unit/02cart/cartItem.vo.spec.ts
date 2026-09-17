import { CartItem } from '@cart/domain/value-objects/cartItem.vo';

describe('CartItem', () => {
  it('crea un item con cantidad positiva', () => {
    const item = new CartItem('prod-1', 2);

    expect(item.productId).toBe('prod-1');
    expect(item.quantity).toBe(2);
  });

  it('rechaza cantidad 0 o negativa', () => {
    expect(() => new CartItem('prod-1', 0)).toThrow(
      'Quantity must be a positive integer',
    );
    expect(() => new CartItem('prod-1', -1)).toThrow(
      'Quantity must be a positive integer',
    );
  });

  it('withQuantity devuelve una nueva instancia', () => {
    const item = new CartItem('prod-1', 2);

    const updated = item.withQuantity(5);

    expect(updated.quantity).toBe(5);
    expect(item.quantity).toBe(2); // no muta el original
  });

  it('addQuantity suma cantidad', () => {
    const item = new CartItem('prod-1', 2);

    const updated = item.addQuantity(3);

    expect(updated.quantity).toBe(5);
  });
});
