import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

import { RegisterUseCase } from '../application/use-cases/register.use-case';
import { LoginUseCase } from '../application/use-cases/login.use-case';

import { RegisterRequestDTO } from '../application/dto/request/register.request.dto';
import { LoginRequestDTO } from '../application/dto/request/login.request.dto';
import {
  AuthResponseDTO,
  RegisterResponseDTO,
} from '../application/dto/response/auth.response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUC: RegisterUseCase,
    private readonly loginUC: LoginUseCase,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un usuario nuevo (rol USER)' })
  @ApiCreatedResponse({
    description: 'Usuario creado',
    type: RegisterResponseDTO,
  })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiConflictResponse({ description: 'Email ya registrado' })
  register(@Body() dto: RegisterRequestDTO): Promise<RegisterResponseDTO> {
    return this.registerUC.execute(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión y obtener access token' })
  @ApiOkResponse({ description: 'Login exitoso', type: AuthResponseDTO })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  login(@Body() dto: LoginRequestDTO): Promise<AuthResponseDTO> {
    return this.loginUC.execute(dto);
  }
}
