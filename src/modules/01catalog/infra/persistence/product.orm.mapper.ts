// src/modules/01catalog/infra/persistence/product.orm.mapper.ts

import { Product } from '../../domain/product.entity';
import { Serial } from '../../domain/value-objects/serial.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { ProductStatus } from '../../domain/value-objects/product-status.vo';
import { ProductEntity } from './product.orm-entity';

export class ProductOrmMapper {
  static toDomain(orm: ProductEntity): Product {
    return new Product(
      orm.id,
      new Serial(orm.serial),
      orm.name,
      new Money(orm.price),
      orm.stock,
      orm.status === 'ACTIVE' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
    );
  }

  static toPersistence(domain: Product): Partial<ProductEntity> {
    return {
      id: domain.id,
      serial: domain.serial.getValue(),
      name: domain.name,
      price: domain.price.getValue(),
      stock: domain.stock,
      status: domain.status.getValue(),
    };
  }
}
