// src/modules/01catalog/domain/product.entity.ts

import { Serial } from './value-objects/serial.vo'
import { Money } from '@common/domain/value-objects/money.vo'
import { ProductStatus } from './enums/productStatus.enum'

export interface IProduct {
  id: string
  serial: Serial
  name: string
  price: Money
  stock: number
  status: ProductStatus
}

export class Product implements IProduct {
  constructor(
    public readonly id: string,
    public readonly serial: Serial,
    public name: string,
    public price: Money,
    public stock: number,
    public status: ProductStatus = ProductStatus.ACTIVE,
  ) {
    this.updateName(name)
    this.updateStock(stock)
    this.updatePrice(price)
  }

  updateName(name: string) {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      throw new Error('Product name cannot be empty')
    }
    this.name = trimmed
  }

  updatePrice(price: Money) {
    if (price.isNegative()) {
      throw new Error('Product price cannot be negative')
    }
    this.price = price
  }

  updateStock(stock: number) {
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Invalid stock')
    }
    this.stock = stock
  }

  isActive(): boolean {
    return this.status === ProductStatus.ACTIVE
  }

  ensureIsActive(): this {
    if (!this.isActive()) {
      throw new Error(`Product ${this.id} is not active for operations`)
    }
    return this
  }

  activate() {
    this.status = ProductStatus.ACTIVE
  }

  deactivate() {
    this.status = ProductStatus.INACTIVE
  }
}

// import { Serial } from './value-objects/serial.vo'
// import { Money } from '@common/domain/value-objects/money.vo'
// import { ProductStatus } from './enums/productStatus.enum'

// export interface IProduct {
//   id: string
//   serial: Serial
//   name: string
//   price: Money
//   stock: number
//   status: ProductStatus
// }

// export class Product implements IProduct {
//   public readonly id: string
//   public readonly serial: Serial
//   private _name: string
//   private _price: Money
//   private _stock: number
//   private _status: ProductStatus

//   constructor(
//     id: string,
//     serial: Serial,
//     name: string,
//     price: Money,
//     stock: number,
//     status: ProductStatus = ProductStatus.ACTIVE,
//   ) {
//     this.id = id
//     this.serial = serial
//     this._name = this.validateName(name)
//     this._price = this.validatePrice(price)
//     this._stock = this.validateStock(stock)
//     this._status = status
//   }

//   // ---- getters (lectura controlada) ----
//   get name(): string { return this._name }
//   get price(): Money { return this._price }
//   get stock(): number { return this._stock }
//   get status(): ProductStatus { return this._status }

//   // ---- comandos ----
//   updateName(name: string): void {
//     this._name = this.validateName(name)
//   }

//   updatePrice(price: Money): void {
//     this._price = this.validatePrice(price)
//   }

//   updateStock(stock: number): void {
//     this._stock = this.validateStock(stock)
//   }

//   activate(): void { this._status = ProductStatus.ACTIVE }
//   deactivate(): void { this._status = ProductStatus.INACTIVE }

//   // ---- consultas ----
//   isActive(): boolean {
//     return this._status === ProductStatus.ACTIVE
//   }

//   ensureIsActive(): this {
//     if (!this.isActive()) {
//       throw new Error(`Product ${this.id} is not active for operations`)
//     }
//     return this
//   }

//   // ---- validaciones puras (sin efectos) ----
//   private validateName(name: string): string {
//     const trimmed = name.trim()
//     if (trimmed.length === 0) throw new Error('Product name cannot be empty')
//     return trimmed
//   }

//   private validatePrice(price: Money): Money {
//     if (price.isNegative()) throw new Error('Product price cannot be negative')
//     return price
//   }

//   private validateStock(stock: number): number {
//     if (!Number.isInteger(stock) || stock < 0) throw new Error('Invalid stock')
//     return stock
//   }
// }
