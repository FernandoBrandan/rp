// src/modules/identity/identity.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './presentation/auth.controller';
import { RegisterUserUseCase } from './application/use-cases/register-user.use-case';
import { LoginUserUseCase } from './application/use-cases/login-user.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { UserEntity } from './infra/persistence/user.orm-entity';
import { TypeOrmUserRepository } from './infra/repositories/typeorm-user.repository';
import { USER_REPOSITORY } from './infra/tokens';
// import { BcryptHashService } from './infra/services/bcrypt-hash.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegisterUserUseCase,
    LoginUserUseCase,
    GetCurrentUserUseCase,
    // BcryptHashService,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
  ],
})
export class IdentityModule {}
