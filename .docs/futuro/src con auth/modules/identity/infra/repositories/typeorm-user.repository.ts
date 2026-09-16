import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../../domain/user.entity';
import { Email } from '../../domain/value-objects/emails.vo';
import { UserRepository } from '../../domain/repositories/user.repository';

import { UserEntity } from '../persistence/user.orm-entity';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.userRepository.findOne({ where: { id } });
    if (!entity) return null;
    return new User(
      entity.id,
      new Email(entity.email),
      entity.passwordHash,
      entity.role as any,
    );
  }

  async findByEmail(email: Email): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { email: email.getValue() },
    });
    if (!entity) return null;
    return new User(
      entity.id,
      new Email(entity.email),
      entity.passwordHash,
      entity.role as any,
    );
  }

  async save(user: User): Promise<void> {
    await this.userRepository.save(this.mapToOrmEntity(user));
  }

  mapToOrmEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.email = user.email.getValue();
    entity.passwordHash = user.passwordHash;
    entity.role = user.role;
    return entity;
  }
}
