import Decimal from 'decimal.js'
import { Currency } from './currency.vo'
import { CurrencyMismatchError } from '../errors/vo.errors'

export interface IMoney {
  add(other: Money): Money
  subtract(other: Money): Money
  isZero(): boolean
  isPositive(): boolean
  isNegative(): boolean
  equals(other: Money): boolean
  toString(): string
}

export class Money implements IMoney {
  private constructor(
    public readonly amount: Decimal,
    public readonly currency: Currency,
  ) {}

  static of(amount: number | string | Decimal, currency: Currency): Money {
    return new Money(new Decimal(amount), currency)
  }

  static zero(currency: Currency): Money {
    return new Money(new Decimal(0), currency)
  }

  add(other: Money): Money {
    this.assertSameCurrency(other)

    return new Money(this.amount.plus(other.amount), this.currency)
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other)

    return new Money(this.amount.minus(other.amount), this.currency)
  }

  isZero(): boolean {
    return this.amount.isZero()
  }

  isPositive(): boolean {
    return this.amount.isPositive()
  }

  isNegative(): boolean {
    return this.amount.isNegative()
  }

  equals(other: Money): boolean {
    return this.currency.equals(other.currency) && this.amount.equals(other.amount)
  }

  toDecimalString(): string {
    return this.amount.toFixed(4)
  }

  toString(): string {
    return `${this.amount.toString()} ${this.currency}`
  }

  multiply(factor: number | string | Decimal): Money {
    return new Money(this.amount.times(factor), this.currency)
  }

  private assertSameCurrency(other: Money): void {
    if (!this.currency.equals(other.currency)) throw new CurrencyMismatchError()
  }

  toNumber(): number {
    return this.amount.toNumber()
  }
}
