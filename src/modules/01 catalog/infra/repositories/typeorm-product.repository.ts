import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InfrastructureException } from '@common/infrastructure.exception';
import { Product } from '../../domain/product.entity';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { ProductEntity } from '../persistence/product.orm-entity';
import { ProductMapper } from '../persistence/product.mapper';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly ormRepo: Repository<ProductEntity>,
  ) {}

  async save(product: Product): Promise<void> {
    try {
      const entity = this.ormRepo.create(ProductMapper.toPersistence(product));
      await this.ormRepo.save(entity);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findById(id: string): Promise<Product | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { id } });
      return orm ? ProductMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findBySerial(serial: string): Promise<Product | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { serial } });
      return orm ? ProductMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findAll(): Promise<Product[]> {
    try {
      const orms = await this.ormRepo.find();
      return orms.map(ProductMapper.toDomain);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const result = await this.ormRepo
      .createQueryBuilder('product')
      .update(ProductEntity)
      .set({
        // SQL: stock = stock - quantity
        stock: () => `stock - ${quantity}`,
      })
      .where('id = :id AND stock >= :quantity', { id: productId, quantity })
      .execute();

    // result.affected será 1 si había stock y se restó.
    // result.affected será 0 si no había stock suficiente (la condición del WHERE falló).
    return result.affected > 0;
  }

  private handleConnectionError(error: any): never {
    const isConnectionError =
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('connect ETIMEDOUT') ||
      error.message?.includes('Connection terminated') ||
      error.message?.includes('Connection lost');

    if (isConnectionError) {
      throw new InfrastructureException('Database connection failed', error);
    }
    throw error;
  }
}
