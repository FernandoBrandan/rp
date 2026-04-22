// src/modules/01catalog/domain/product.entity.ts

import { Serial } from './value-objects/serial.vo';
import { Money } from './value-objects/money.vo';
import { ProductStatus } from './value-objects/product-status.vo';

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

  updatePrice(price: Money) {
    this.price = price;
  }

  updateStock(stock: number) {
    if (stock < 0) throw new Error('Invalid stock');
    this.stock = stock;
  }

  deactivate() {
    this.status = ProductStatus.INACTIVE;
  }

  activate() {
    this.status = ProductStatus.ACTIVE;
  }
}
