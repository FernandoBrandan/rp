// src/modules/01catalog/domain/value-objects/serial.vo.ts
export class Serial {
  constructor(public readonly value: string) {
    if (!value.startsWith('PROD-')) {
      throw new Error('Invalid serial');
    }
  }

  getValue(): string {
    return this.value;
  }
}
