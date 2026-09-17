import { Money } from '@common/domain/value-objects/money.vo';
import { OrderItem } from '@order/domain/value-objects/orderItem.vo';

describe('OrderItem', () => {
  it('calcula el subtotal', () => {
    const item = new OrderItem('prod-1', 3, new Money(100));

    expect(item.subtotal().getValue()).toBe(300);
  });

  it('rechaza cantidad menor o igual a 0', () => {
    expect(() => new OrderItem('prod-1', 0, new Money(100))).toThrow(
      'Quantity must be greater than 0',
    );

    expect(() => new OrderItem('prod-1', -1, new Money(100))).toThrow(
      'Quantity must be greater than 0',
    );
  });
});
