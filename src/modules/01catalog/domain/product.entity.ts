// src/modules/01catalog/domain/product.entity.ts

import { Serial } from './value-objects/serial.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { ProductStatus } from './enums/productStatus.enum';

export interface IProduct {
  id: string;
  serial: Serial;
  name: string;
  price: Money;
  stock: number;
  status: ProductStatus;
}

export class Product implements IProduct {
  constructor(
    public readonly id: string,
    public readonly serial: Serial,
    public name: string,
    public price: Money,
    public stock: number,
    public status: ProductStatus = ProductStatus.ACTIVE,
  ) {}

  updateName(name: string) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new Error('Product name cannot be empty');
    }
    this.name = trimmed;
  }

  updatePrice(price: Money) {
    this.price = price;
  }

  updateStock(stock: number) {
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Invalid stock');
    }
    this.stock = stock;
  }

  activate() {
    this.status = ProductStatus.ACTIVE;
  }

  deactivate() {
    this.status = ProductStatus.INACTIVE;
  }
}
