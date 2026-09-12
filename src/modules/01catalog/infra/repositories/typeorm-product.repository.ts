// src/modules/01catalog/infra/repositories/typeorm-product.repository.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InfrastructureException } from '@common/exceptions/infrastructure.exception';
import { Product } from '@catalog/domain/product.entity';
import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { ProductEntity } from '../persistence/product.orm-entity';
import { ProductOrmMapper } from '../persistence/product.orm.mapper';

@Injectable()
export class TypeOrmProductRepository implements ProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly ormRepo: Repository<ProductEntity>,
  ) {}

  async save(product: Product): Promise<void> {
    try {
      const entity = this.ormRepo.create(
        ProductOrmMapper.toPersistence(product),
      );
      await this.ormRepo.save(entity);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findById(id: string): Promise<Product | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { id } });
      return orm ? ProductOrmMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    try {
      if (ids.length === 0) return [];
      const orms = await this.ormRepo.find({ where: { id: In(ids) } });
      return orms.map(ProductOrmMapper.toDomain);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findBySerial(serial: string): Promise<Product | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { serial } });
      return orm ? ProductOrmMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findAll(): Promise<Product[]> {
    try {
      const orms = await this.ormRepo.find();
      return orms.map(ProductOrmMapper.toDomain);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const result = await this.ormRepo
      .createQueryBuilder()
      .update(ProductEntity)
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :id AND stock >= :quantity', { id: productId, quantity })
      .execute();
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
