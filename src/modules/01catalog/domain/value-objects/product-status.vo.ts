// src/modules/01catalog/domain/value-objects/product-status.vo.ts
export class ProductStatus {
  private constructor(private readonly value: string) {}

  static ACTIVE = new ProductStatus('ACTIVE');
  static INACTIVE = new ProductStatus('INACTIVE');

  getValue() {
    return this.value;
  }
}
