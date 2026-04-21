import { Injectable, ConflictException, Inject } from '@nestjs/common';

import { RegisterUserDTO } from '../dto/register-user.dto';

import { User } from '../../domain/user.entity';
import { Email } from '../../domain/value-objects/emails.vo';

import { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../infra/tokens';

@Injectable()
export class RegisterUser {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    private readonly hashService,
  ) {}

  async execute(dto: RegisterUserDTO): Promise<User> {
    const email = new Email(dto.email);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new ConflictException('User already exists');

    const passwordHash = await this.hashService.hash(dto.password);
    const user = new User(crypto.randomUUID(), email, passwordHash, 'USER');

    await this.userRepository.save(user);
    return user;
  }
}
