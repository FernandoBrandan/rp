import { TestDatabase } from './postgres-container';
import { TypeOrmProductRepository } from '@catalog/infra/repositories/typeorm-product.repository';
import { ProductEntity } from '@catalog/infra/persistence/product.orm-entity';
import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';
import { Money } from '@common/domain/value-objects/money.vo';

describe('TypeOrmProductRepository (integration)', () => {
  let db: TestDatabase;
  let repo: TypeOrmProductRepository;

  beforeAll(async () => {
    db = new TestDatabase();
    await db.start();
    repo = new TypeOrmProductRepository(
      db.dataSource.getRepository(ProductEntity),
    );
  }, 60_000); // ⚠️ el container tarda en arrancar

  beforeEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.stop();
  });

  function makeProduct(serial = 'PROD-000001'): Product {
    return new Product(
      crypto.randomUUID(),
      new Serial(serial),
      'Laptop',
      new Money(100),
      10,
      ProductStatus.ACTIVE,
    );
  }

  it('guarda y recupera un producto por id', async () => {
    const product = makeProduct();

    await repo.save(product);
    const found = await repo.findById(product.id);

    expect(found).not.toBeNull();
    expect(found!.serial.getValue()).toBe('PROD-000001');
    expect(found!.name).toBe('Laptop');
    expect(found!.price.getValue()).toBe(100);
    expect(found!.stock).toBe(10);
    expect(found!.status).toBe(ProductStatus.ACTIVE);
  });

  it('findBySerial devuelve null si no existe', async () => {
    const found = await repo.findBySerial('PROD-999999');

    expect(found).toBeNull();
  });

  it('falla si el serial ya existe (unique constraint)', async () => {
    await repo.save(makeProduct('PROD-000001'));

    await expect(repo.save(makeProduct('PROD-000001'))).rejects.toThrow();
  });

  it('findByIds devuelve solo los productos existentes', async () => {
    const p1 = makeProduct('PROD-000001');
    const p2 = makeProduct('PROD-000002');
    await repo.save(p1);
    await repo.save(p2);

    const found = await repo.findByIds([p1.id, p2.id, 'no-existe']);

    expect(found).toHaveLength(2);
  });

  it('findByIds con array vacío devuelve []', async () => {
    const found = await repo.findByIds([]);

    expect(found).toEqual([]);
  });

  it('findAll devuelve todos los productos', async () => {
    await repo.save(makeProduct('PROD-000001'));
    await repo.save(makeProduct('PROD-000002'));

    const all = await repo.findAll();

    expect(all).toHaveLength(2);
  });

  it('save actualiza un producto existente', async () => {
    const product = makeProduct();
    await repo.save(product);

    product.updateName('Mouse');
    product.updatePrice(new Money(250));
    await repo.save(product);

    const found = await repo.findById(product.id);
    expect(found!.name).toBe('Mouse');
    expect(found!.price.getValue()).toBe(250);
  });
});
