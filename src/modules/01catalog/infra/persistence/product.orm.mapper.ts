// src/modules/01catalog/infra/persistence/product.orm.mapper.ts

import { Product } from '@catalog/domain/product.entity'
import { Serial } from '@catalog/domain/value-objects/serial.vo'
import { Money } from '@main/common/domain/value-objects/money.vo'
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum'
import { ProductEntity } from './product.orm-entity'
import { Currency } from '@main/common/domain/value-objects/currency.vo'

export class ProductOrmMapper {
  static toDomain(orm: ProductEntity): Product {
    return new Product(
      orm.id,
      new Serial(orm.serial),
      orm.name,
      Money.of(orm.price, Currency.USD),
      orm.stock,
      orm.status === 'ACTIVE' ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
    )
  }

  static toPersistence(domain: Product): Partial<ProductEntity> {
    return {
      id: domain.id,
      serial: domain.serial.getValue(),
      name: domain.name,
      price: domain.price.toDecimalString(),
      stock: domain.stock,
      status: domain.status,
    }
  }
}
