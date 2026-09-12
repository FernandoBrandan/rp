export class InsufficientStockException extends Error {
  constructor(public readonly productId: string) {
    super(`Insufficient stock for product ${productId}`);
    this.name = 'InsufficientStockException';
  }
}
