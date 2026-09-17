import { TestDatabase } from './postgres-container';
import { TypeOrmCartRepository } from '@cart/infra/repositories/typeorm-cart.repository';
import { CartOrmEntity } from '@cart/infra/persistence/cart.orm-entity';
import { Cart } from '@cart/domain/cart.entity';
import { CartItem } from '@cart/domain/value-objects/cartItem.vo';

describe('TypeOrmCartRepository (integration)', () => {
  let db: TestDatabase;
  let repo: TypeOrmCartRepository;

  beforeAll(async () => {
    db = new TestDatabase();
    await db.start();
    repo = new TypeOrmCartRepository(
      db.dataSource.getRepository(CartOrmEntity),
    );
  }, 60_000);

  beforeEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.stop();
  });

  it('devuelve null si el carrito no existe', async () => {
    const found = await repo.getCart('user-1');

    expect(found).toBeNull();
  });

  it('guarda un carrito nuevo y lo recupera', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);

    await repo.save(cart);
    const found = await repo.getCart('user-1');

    expect(found).not.toBeNull();
    expect(found.userId).toBe('user-1');
    expect(found.items).toHaveLength(1);
    expect(found.items[0].productId).toBe('prod-1');
    expect(found.items[0].quantity).toBe(2);
  });

  it('actualiza un carrito existente (upsert)', async () => {
    const cart = new Cart('user-1', [new CartItem('prod-1', 2)]);
    await repo.save(cart);

    cart.addItem(new CartItem('prod-2', 1));
    await repo.save(cart);

    const found = await repo.getCart('user-1');
    expect(found.items).toHaveLength(2);
  });

  it('clear() borra el carrito', async () => {
    await repo.save(new Cart('user-1', [new CartItem('prod-1', 2)]));

    await repo.clear('user-1');

    expect(await repo.getCart('user-1')).toBeNull();
  });

  it('guarda items como JSON correctamente', async () => {
    const cart = new Cart('user-1', [
      new CartItem('prod-1', 2),
      new CartItem('prod-2', 5),
    ]);

    await repo.save(cart);
    const found = await repo.getCart('user-1');

    expect(found.items.map((i) => i.productId)).toEqual(['prod-1', 'prod-2']);
    expect(found.items.map((i) => i.quantity)).toEqual([2, 5]);
  });
});
