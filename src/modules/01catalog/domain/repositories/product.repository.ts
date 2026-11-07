// src/modules/01catalog/domain/repositories/product.repository.ts
import { Product } from '../product.entity';

export interface ProductRepository {
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
  findByIds(ids: string[]): Promise<Product[]>;
  findBySerial(serial: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  reserveStock(productId: string, quantity: number): Promise<boolean>;
}
