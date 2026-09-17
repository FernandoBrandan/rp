import { TestDatabase } from './postgres-container';
import { TypeOrmOrderRepository } from '@order/infra/repositories/typeorm-order.repository';
import { OrderEntity } from '@order/infra/persistence/order.orm-entity';
import { Order } from '@order/domain/order.entity';
import { OrderItem } from '@order/domain/value-objects/orderItem.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { OrderStatus } from '@order/domain/enums/orderStatus.enum';

describe('TypeOrmOrderRepository (integration)', () => {
  let db: TestDatabase;
  let repo: TypeOrmOrderRepository;

  beforeAll(async () => {
    db = new TestDatabase();
    await db.start();
    repo = new TypeOrmOrderRepository(db.dataSource.getRepository(OrderEntity));
  }, 60_000);

  beforeEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.stop();
  });

  function makeOrder(id = 'ORDER-1', idempotencyKey = 'key-1'): Order {
    return Order.create({
      id,
      userId: 'user-1',
      idempotencyKey,
      items: [new OrderItem('prod-1', 2, new Money(100))],
      reservationId: 'res-1',
    });
  }

  it('crea y recupera una orden', async () => {
    await repo.createOrder(makeOrder());

    const found = await repo.getOrderDetail('ORDER-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('ORDER-1');
    expect(found!.userId).toBe('user-1');
    expect(found!.total.getValue()).toBe(200);
    expect(found!.status).toBe(OrderStatus.PENDING);
  });

  it('getOrderDetail devuelve null si no existe', async () => {
    const found = await repo.getOrderDetail('NO-EXISTE');

    expect(found).toBeNull();
  });

  it('findByIdempotencyKey recupera por key', async () => {
    await repo.createOrder(makeOrder());

    const found = await repo.findByIdempotencyKey('key-1');

    expect(found).not.toBeNull();
    expect(found!.id).toBe('ORDER-1');
  });

  it('falla si la idempotencyKey ya existe (unique constraint)', async () => {
    await repo.createOrder(makeOrder('ORDER-1', 'key-1'));

    await expect(
      repo.createOrder(makeOrder('ORDER-2', 'key-1')), // misma key, distinto id
    ).rejects.toThrow();
  });

  it('update persiste cambios de estado', async () => {
    const order = makeOrder();
    await repo.createOrder(order);

    order.pay();
    await repo.update(order);

    const found = await repo.getOrderDetail('ORDER-1');
    expect(found!.status).toBe(OrderStatus.PAID);
  });

  it('getOrdersByUser devuelve solo las del usuario', async () => {
    await repo.createOrder(makeOrder('ORDER-1', 'key-1'));
    await repo.createOrder(makeOrder('ORDER-2', 'key-2'));

    const orders = await repo.getOrdersByUser('user-1');

    expect(orders).toHaveLength(2);
  });

  it('mapea items y total correctamente desde la DB', async () => {
    const order = Order.create({
      id: 'ORDER-1',
      userId: 'user-1',
      idempotencyKey: 'key-1',
      items: [
        new OrderItem('prod-1', 2, new Money(100)),
        new OrderItem('prod-2', 1, new Money(50)),
      ],
      reservationId: 'res-1',
    });
    await repo.createOrder(order);

    const found = await repo.getOrderDetail('ORDER-1');

    expect(found!.items).toHaveLength(2);
    expect(found!.total.getValue()).toBe(250);
  });
});
