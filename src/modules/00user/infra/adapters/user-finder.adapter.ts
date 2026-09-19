import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { USER_REPOSITORY } from '@infra/tokens';
import { UserRepository } from '@user/domain/repositories/user.repository';
import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRole } from '@common/user-role.enum';

import {
  CreateUserInput,
  UserFinderPort,
  UserSnapshot,
} from '@user/application/ports/user-finder.port';

@Injectable()
export class UserFinderAdapter implements UserFinderPort {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async findById(id: string): Promise<UserSnapshot | null> {
    const user = await this.userRepository.findById(id);
    return user ? this.toSnapshot(user) : null;
  }

  async findByEmail(email: string): Promise<UserSnapshot | null> {
    const user = await this.userRepository.findByEmail(new Email(email));
    return user ? this.toSnapshot(user) : null;
  }

  async create(input: CreateUserInput): Promise<UserSnapshot> {
    const user = new User(
      randomUUID(),
      new Email(input.email),
      input.passwordHash,
      input.role as UserRole,
    );
    await this.userRepository.save(user);
    return this.toSnapshot(user);
  }

  private toSnapshot(user: User): UserSnapshot {
    return {
      id: user.id,
      email: user.email.getValue(),
      passwordHash: user.passwordHash,
      role: user.role,
    };
  }
}
