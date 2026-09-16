import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';

import { HASH_SERVICE, TOKEN_SERVICE, JWT_SERVICE } from '@shared/tokens';
import { HashService } from '@shared/ports/hash.service';
import { TokenService } from '@shared/ports/token.service';

import { PasswordHasher } from './services/password-hasher.service';
import { AuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [
    {
      provide: HASH_SERVICE,
      useClass: PasswordHasher,
    },
    {
      provide: JWT_SERVICE,
      useExisting: JwtService,
    },
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    HASH_SERVICE,
    TOKEN_SERVICE,
    JWT_SERVICE,
    AuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthInfraModule {}
