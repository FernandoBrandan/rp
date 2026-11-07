import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InfrastructureException } from '@common/exceptions/infrastructure.exception';
import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRepository } from '@user/domain/repositories/user.repository';

import { UserEntity } from '../persistence/user.orm-entity';
import { UserOrmMapper } from '../persistence/user.orm.mapper';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly ormRepo: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    try {
      const orm = await this.ormRepo.findOne({ where: { id } });
      return orm ? UserOrmMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async findByEmail(email: Email): Promise<User | null> {
    try {
      const orm = await this.ormRepo.findOne({
        where: { email: email.getValue() },
      });
      return orm ? UserOrmMapper.toDomain(orm) : null;
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  async save(user: User): Promise<void> {
    try {
      const entity = this.ormRepo.create(UserOrmMapper.toPersistence(user));
      await this.ormRepo.save(entity);
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
