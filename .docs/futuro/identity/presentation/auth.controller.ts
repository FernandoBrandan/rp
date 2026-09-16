// src/modules/identity/presentation/auth.controller.ts
import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { GetCurrentUserUseCase } from '../application/use-cases/get-current-user.use-case';

@Controller('auth')
export class AuthController {
  constructor(
    private registerUser: RegisterUserUseCase,
    private loginUser: LoginUserUseCase,
    private getCurrentUser: GetCurrentUserUseCase,
  ) {}

  @Post('register')
  register(@Body() dto: any) {
    return this.registerUser.execute(dto);
  }

  @Post('login')
  login(@Body() dto: any) {
    return this.loginUser.execute(dto);
  }

  @Get('me')
  me(@Req() req: any) {
    return this.getCurrentUser.execute(req.user.id);
  }
}
