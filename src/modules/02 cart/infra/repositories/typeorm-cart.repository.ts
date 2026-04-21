import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InfrastructureException } from '@common/infrastructure.exception';
import { Cart } from '../../domain/cart.entity';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartOrmEntity } from '../persistence/cart.orm-entity';
import { CartMapper } from '../persistence/cart.mapper';

@Injectable()
export class TypeOrmCartRepository implements CartRepository {
  constructor(
    @InjectRepository(CartOrmEntity)
    private readonly ormRepo: Repository<CartOrmEntity>,
  ) {}

  async getCart(userId: string): Promise<Cart | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { userId } });
      return orm ? CartMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async save(cart: Cart): Promise<void> {
    try {
      const persistenceModel = CartMapper.toPersistence(cart);

      const existing = await this.ormRepo.findOne({
        where: { userId: cart.userId },
      });

      if (existing) {
        await this.ormRepo.update({ userId: cart.userId }, persistenceModel);
      } else {
        const entity = this.ormRepo.create(persistenceModel);
        await this.ormRepo.save(entity);
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async clear(userId: string): Promise<void> {
    try {
      await this.ormRepo.delete({ userId });
    } catch (error) {
      this.handleConnectionError(error);
    }
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
