import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { RegisterUser } from '../application/use-cases/register-user';
import { LoginUser } from '../application/use-cases/login-user';
import { GetCurrentUser } from '../application/use-cases/get-current-user';

import { AuthGuard } from '../../../infra/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infra/auth/guards/roles.guard';
import { Roles } from '../../../infra/auth/decorators/roles.decorator';

@Controller('auth')
@UseGuards(AuthGuard, RolesGuard) // ← todo el controller
export class AuthController {
  constructor(
    private registerUser: RegisterUser,
    private loginUser: LoginUser,
    private getCurrentUser: GetCurrentUser,
  ) {}

  @Post('register')
  // @Roles('ADMIN')
  register(@Body() dto: any) {
    return this.registerUser.execute(dto);
  }

  @Post('login')
  login(@Body() dto: any) {
    return this.loginUser.execute(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard) // ← protege solo esta ruta
  me(@Req() req: any) {
    return this.getCurrentUser.execute(req.user.id);
  }
}
