export class Money {
  constructor(private readonly amount: number) {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
  }

  getValue() {
    return this.amount;
  }

  add(other: Money): Money {
    return new Money(this.amount + other.amount);
  }

  multiply(qty: number): Money {
    return new Money(this.amount * qty);
  }
}
