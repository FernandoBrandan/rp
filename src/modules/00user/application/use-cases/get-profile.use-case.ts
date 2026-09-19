import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, USER_REPOSITORY } from '@infra/tokens';

import { UserRepository } from '@user/domain/repositories/user.repository';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string) {
    this.logger.info('Getting user profile', { userId });

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    return UserMapper.toResponse(user);
  }
}
