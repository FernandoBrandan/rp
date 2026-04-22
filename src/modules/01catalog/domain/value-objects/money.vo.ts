// src/modules/01catalog/domain/value-objects/money.vo.ts
export class Money {
  constructor(private readonly value: number) {
    if (value < 0) throw new Error('Price cannot be negative');
  }

  getValue() {
    return this.value;
  }
}
