import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { USER_REPOSITORY, USER_FINDER } from '@infra/tokens';
import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module';
import { LoggerModule } from '@infra/logger/logger.module';

import { UsersController } from './presentation/users.controller';

import { GetProfileUseCase } from './application/use-cases/get-profile.use-case';

import { UserEntity } from './infra/persistence/user.orm-entity';
import { TypeOrmUserRepository } from './infra/repositories/typeorm-user.repository';
import { UserFinderAdapter } from './infra/adapters/user-finder.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    LoggerModule,
    AuthInfraModule,
  ],
  controllers: [UsersController],
  providers: [
    GetProfileUseCase,
    TypeOrmUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
    UserFinderAdapter,
    {
      provide: USER_FINDER,
      useExisting: UserFinderAdapter,
    },
  ],
  exports: [USER_REPOSITORY, USER_FINDER],
})
export class UserModule {}
