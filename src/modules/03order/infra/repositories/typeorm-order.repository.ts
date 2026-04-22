// src/modules/03order/infra/repositories/typeorm-order.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InfrastructureException } from '@common/exceptions/infrastructure.exception';
import { Order } from '../../domain/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderEntity } from '../persistence/order.orm-entity';
import { OrderMapper } from '../persistence/order.orm.mapper';

@Injectable()
export class TypeOrmOrderRepository implements OrderRepository {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly ormRepo: Repository<OrderEntity>,
  ) {}

  async createOrder(order: Order): Promise<void> {
    try {
      const entity = this.ormRepo.create(OrderMapper.toPersistence(order));
      await this.ormRepo.save(entity);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    try {
      const orms = await this.ormRepo.find({ where: { userId } });
      return orms.map(OrderMapper.toDomain);
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async getOrderDetail(id: string): Promise<Order | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { id } });
      return orm ? OrderMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async update(order: Order): Promise<void> {
    try {
      const persistenceModel = OrderMapper.toPersistence(order);
      const entity = await this.ormRepo.preload(persistenceModel);

      if (entity) {
        await this.ormRepo.save(entity);
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<Order | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { idempotencyKey } });
      return orm ? OrderMapper.toDomain(orm) : null;
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
