import { Money } from '@common/domain/value-objects/money.vo';
import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

function makeProduct() {
  return new Product(
    'prod-1',
    new Serial('PROD-000001'),
    'Laptop',
    new Money(100),
    10,
    ProductStatus.ACTIVE,
  );
}

describe('Product', () => {
  it('crea un producto ACTIVE por defecto', () => {
    const product = new Product(
      'prod-1',
      new Serial('PROD-000001'),
      'Laptop',
      new Money(100),
      10,
    );

    expect(product.status).toBe(ProductStatus.ACTIVE);
  });

  it('updateName recorta espacios y rechaza vacío', () => {
    const product = makeProduct();

    product.updateName('  Mouse  ');

    expect(product.name).toBe('Mouse');
    expect(() => product.updateName('   ')).toThrow(
      'Product name cannot be empty',
    );
  });

  it('updateStock rechaza negativos y no enteros', () => {
    const product = makeProduct();

    product.updateStock(5);

    expect(product.stock).toBe(5);
    expect(() => product.updateStock(-1)).toThrow('Invalid stock');
    expect(() => product.updateStock(1.5)).toThrow('Invalid stock');
  });

  it('ensureIsActive lanza error si está INACTIVE', () => {
    const product = makeProduct();

    product.deactivate();

    expect(() => product.ensureIsActive()).toThrow('is not active');
  });
});
