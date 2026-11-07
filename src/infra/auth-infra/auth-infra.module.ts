import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { HASH_SERVICE, JWT_SERVICE } from '@infra/tokens';

import { PasswordHasher } from './services/password-hasher.service';
import { AuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // signOptions: { expiresIn: '1h' },
        expiresIn: config.get<string>('JWT_EXPIRES_IN', '1d'),
      }),
    }),
  ],
  providers: [
    {
      provide: JWT_SERVICE,
      useExisting: JwtService,
    },
    {
      provide: HASH_SERVICE,
      useClass: PasswordHasher,
    },
    AuthGuard,
    RolesGuard,
  ],
  exports: [JWT_SERVICE, HASH_SERVICE, AuthGuard, RolesGuard, JwtModule],
})
export class AuthInfraModule {}
