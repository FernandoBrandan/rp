import { Module } from '@nestjs/common';

import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module';
import { LoggerModule } from '@infra/logger/logger.module';
import { UserModule } from '@user/user.module';

import { AuthController } from './presentation/auth.controller';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';

@Module({
  imports: [UserModule, AuthInfraModule, LoggerModule],
  controllers: [AuthController],
  providers: [RegisterUseCase, LoginUseCase],
})
export class AuthModule {}
