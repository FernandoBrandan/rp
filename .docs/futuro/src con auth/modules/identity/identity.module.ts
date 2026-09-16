import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthInfraModule } from '@infra/auth/auth.module'; // ← Importa aquí
import { HASH_SERVICE } from '@shared/tokens';

import { AuthController } from './presentation/auth.controller';
import { RegisterUser } from './application/use-cases/register-user';
import { LoginUser } from './application/use-cases/login-user';
import { GetCurrentUser } from './application/use-cases/get-current-user';

import { USER_REPOSITORY } from './infra/tokens';
import { UserEntity } from './infra/persistence/user.orm-entity';
import { TypeOrmUserRepository } from './infra/repositories/typeorm-user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), AuthInfraModule],
  controllers: [AuthController],
  providers: [
    RegisterUser,
    LoginUser,
    GetCurrentUser,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
})
export class IdentityModule {}
