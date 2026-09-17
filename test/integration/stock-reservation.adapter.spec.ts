import { TestDatabase } from './postgres-container';
import { StockReservationAdapter } from '@catalog/infra/adapters/stock-reservation.adapter';
import { ProductEntity } from '@catalog/infra/persistence/product.orm-entity';
import { StockReservationEntity } from '@catalog/infra/persistence/stock-reservation.orm-entity';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('StockReservationAdapter (integration)', () => {
  let db: TestDatabase;
  let adapter: StockReservationAdapter;

  beforeAll(async () => {
    db = new TestDatabase();
    await db.start();
    adapter = new StockReservationAdapter(
      db.dataSource,
      db.dataSource.getRepository(StockReservationEntity),
      makeLogger() as any,
    );
  }, 60_000);

  beforeEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.stop();
  });

  async function insertProduct(id: string, stock: number) {
    await db.dataSource.getRepository(ProductEntity).save({
      id,
      serial: `PROD-${id}`,
      name: 'X',
      price: 100,
      stock,
      status: 'ACTIVE',
    });
  }

  async function getStock(id: string): Promise<number> {
    const p = await db.dataSource
      .getRepository(ProductEntity)
      .findOne({ where: { id } });
    return p!.stock;
  }

  async function getReservationStatus(reservationId: string): Promise<string> {
    const r = await db.dataSource
      .getRepository(StockReservationEntity)
      .findOne({ where: { id: reservationId } });
    return r!.status;
  }

  // ─── reserveStock ──────────────────────────────────────────────
  it('descuenta stock y crea la reserva', async () => {
    await insertProduct('prod-1', 10);

    const id = await adapter.reserveStock(
      [{ productId: 'prod-1', quantity: 3 }],
      'ORDER-1',
    );

    expect(id).toBeDefined();
    expect(await getStock('prod-1')).toBe(7);
    expect(await getReservationStatus(id)).toBe('RESERVED');
  });

  it('lanza InsufficientStockException si no hay stock suficiente', async () => {
    await insertProduct('prod-1', 2);

    await expect(
      adapter.reserveStock([{ productId: 'prod-1', quantity: 5 }], 'ORDER-1'),
    ).rejects.toThrow('Insufficient stock');

    expect(await getStock('prod-1')).toBe(2); // no descontó nada
  });

  it('rollbackea toda la transacción si un item falla', async () => {
    await insertProduct('prod-1', 10);
    await insertProduct('prod-2', 1);

    await expect(
      adapter.reserveStock(
        [
          { productId: 'prod-1', quantity: 3 }, // ok
          { productId: 'prod-2', quantity: 5 }, // falla
        ],
        'ORDER-1',
      ),
    ).rejects.toThrow();

    // prod-1 NO debe haber quedado descontado
    expect(await getStock('prod-1')).toBe(10);
    expect(await getStock('prod-2')).toBe(1);
  });

  it('bajo concurrencia, nunca deja stock negativo (race condition)', async () => {
    await insertProduct('prod-1', 1);

    // Dos requests en paralelo pidiendo la misma unidad
    const results = await Promise.allSettled([
      adapter.reserveStock([{ productId: 'prod-1', quantity: 1 }], 'ORDER-A'),
      adapter.reserveStock([{ productId: 'prod-1', quantity: 1 }], 'ORDER-B'),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    expect(succeeded).toBe(1); // solo una pudo
    expect(await getStock('prod-1')).toBe(0); // stock consistente
  });

  // ─── confirmReservation ────────────────────────────────────────
  it('confirmReservation marca la reserva como CONFIRMED', async () => {
    await insertProduct('prod-1', 10);
    const id = await adapter.reserveStock(
      [{ productId: 'prod-1', quantity: 3 }],
      'ORDER-1',
    );

    await adapter.confirmReservation(id);

    expect(await getReservationStatus(id)).toBe('CONFIRMED');
    expect(await getStock('prod-1')).toBe(7); // no cambia
  });

  it('confirmReservation falla si la reserva no existe', async () => {
    await expect(adapter.confirmReservation('no-existe')).rejects.toThrow();
  });

  // ─── releaseReservation ────────────────────────────────────────
  it('releaseReservation devuelve el stock y marca RELEASED', async () => {
    await insertProduct('prod-1', 10);
    const id = await adapter.reserveStock(
      [{ productId: 'prod-1', quantity: 3 }],
      'ORDER-1',
    );

    await adapter.releaseReservation(id);

    expect(await getReservationStatus(id)).toBe('RELEASED');
    expect(await getStock('prod-1')).toBe(10); // devuelto
  });

  it('releaseReservation falla si ya está RELEASED', async () => {
    await insertProduct('prod-1', 10);
    const id = await adapter.reserveStock(
      [{ productId: 'prod-1', quantity: 3 }],
      'ORDER-1',
    );

    await adapter.releaseReservation(id);

    await expect(adapter.releaseReservation(id)).rejects.toThrow();
  });

  it('releaseReservation no libera dos veces (no duplica stock)', async () => {
    await insertProduct('prod-1', 10);
    const id = await adapter.reserveStock(
      [{ productId: 'prod-1', quantity: 3 }],
      'ORDER-1',
    );

    await adapter.releaseReservation(id);
    await expect(adapter.releaseReservation(id)).rejects.toThrow();

    // Sin el segundo release, el stock debe ser 10, no 13
    expect(await getStock('prod-1')).toBe(10);
  });
});
