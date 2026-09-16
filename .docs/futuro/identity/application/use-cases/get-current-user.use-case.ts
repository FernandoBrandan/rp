// src/modules/identity/application/use-cases/get-current-user.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { User } from '../../domain/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';

import { USER_REPOSITORY } from '../../infra/tokens';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
