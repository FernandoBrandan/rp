import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { RegisterUser } from '../application/use-cases/register-user';
import { LoginUser } from '../application/use-cases/login-user';
import { GetCurrentUser } from '../application/use-cases/get-current-user';

@Controller('auth')
export class AuthController {
  constructor(
    private registerUser: RegisterUser,
    private loginUser: LoginUser,
    private getCurrentUser: GetCurrentUser,
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
