// src/modules/03order/application/ports/product-finder.port.ts

export interface ProductSnapshot {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: string;
}

export interface ProductFinderPort {
  findByIds(productIds: string[]): Promise<ProductSnapshot[]>;
}
