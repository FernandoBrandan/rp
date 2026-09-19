import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { UserRole } from '@common/user-role.enum';
import { Logger } from '@infra/logger/logger.interface';
import { HASH_SERVICE, LOGGER, USER_FINDER } from '@infra/tokens';

import { HashService } from '@infra/auth-infra/ports/hash.service';

import {
  UserFinderPort,
  UserSnapshot,
} from '@user/application/ports/user-finder.port';

import { RegisterRequestDTO } from '../dto/request/register.request.dto';
import { RegisterResponseDTO } from '../dto/response/auth.response.dto';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_FINDER)
    private readonly userFinder: UserFinderPort,

    @Inject(HASH_SERVICE)
    private readonly hashService: HashService,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: RegisterRequestDTO): Promise<RegisterResponseDTO> {
    const email = dto.email.trim().toLowerCase();
    this.logger.info('Register attempt', { email });

    const existing = await this.userFinder.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashService.hash(dto.password);

    let created: UserSnapshot;
    try {
      created = await this.userFinder.create({
        email,
        passwordHash,
        role: UserRole.USER, // registro público siempre USER
      });
    } catch (error: any) {
      // carrera: otro request con el mismo email ganó el unique
      if (error?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }

    this.logger.info('User registered', { userId: created.id });

    return {
      id: created.id,
      email: created.email,
      role: created.role as UserRole,
    };
  }
}
