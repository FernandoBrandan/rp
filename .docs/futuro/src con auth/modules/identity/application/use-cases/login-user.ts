import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import { LoginUserDTO } from '../dto/login-user.dto';

import { Email } from '../../domain/value-objects/emails.vo';
import { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../infra/tokens';

import { HASH_SERVICE } from '@shared/tokens';
import { HashService } from '@shared/ports/hash.service';

@Injectable()
export class LoginUser {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,

    @Inject(HASH_SERVICE)
    private readonly hashService: HashService,

    private readonly jwtService: JwtService,
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
