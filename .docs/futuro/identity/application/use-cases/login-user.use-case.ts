// src/modules/identity/application/use-cases/login-user.use-case.ts
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { LoginUserDTO } from '../dto/login-user.request.dto';

import { Email } from '../../domain/value-objects/emails.vo';
import { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../infra/tokens';

@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    private readonly jwtService: JwtService,
    private readonly hashService,
  ) {}

  async execute(dto: LoginUserDTO) {
    const email = new Email(dto.email);
    const user = await this.userRepository.findByEmail(email);

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isValid = await this.hashService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isValid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({ sub: user.id, role: user.role });
    return { token };
  }
}
