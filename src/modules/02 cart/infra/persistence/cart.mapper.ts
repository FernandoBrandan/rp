import { Cart } from '../../domain/cart.entity';
import { CartItem } from '../../domain/value-objects/cartItem.vo';
import { CartOrmEntity } from './cart.orm-entity';

export class CartMapper {
  static toDomain(orm: CartOrmEntity): Cart {
    const domainItems = orm.items.map(
      (item) => new CartItem(item.productId, item.quantity),
    );
    return new Cart(orm.userId, domainItems);
  }

  static toPersistence(domain: Cart): Partial<CartOrmEntity> {
    return {
      userId: domain.userId,
      items: domain.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }
}
