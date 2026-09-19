import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Logger } from '@infra/logger/logger.interface';
import { HASH_SERVICE, JWT_SERVICE, LOGGER, USER_FINDER } from '@infra/tokens';
import { UserRole } from '@common/user-role.enum';

import { HashService } from '@infra/auth-infra/ports/hash.service';
import { UserFinderPort } from '@user/application/ports/user-finder.port';

import { LoginRequestDTO } from '../dto/request/login.request.dto';
import { AuthResponseDTO } from '../dto/response/auth.response.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_FINDER)
    private readonly userFinder: UserFinderPort,

    @Inject(HASH_SERVICE)
    private readonly hashService: HashService,

    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: LoginRequestDTO): Promise<AuthResponseDTO> {
    const email = dto.email.trim().toLowerCase();
    this.logger.info('Login attempt', { email });

    const user = await this.userFinder.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.hashService.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.info('Login success', { userId: user.id });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
      },
    };
  }
}
