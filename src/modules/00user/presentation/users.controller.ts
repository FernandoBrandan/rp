import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { AuthGuard } from '@infra/auth-infra/guards/jwt-auth.guard';
import { CurrentUser } from '@infra/auth-infra/decorators/current-user.decorator';

import { GetProfileUseCase } from '../application/use-cases/get-profile.use-case';
import { UserResponseDTO } from '../application/dto/response/user.response.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly getProfile: GetProfileUseCase) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Perfil', type: UserResponseDTO })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado' })
  me(@CurrentUser('sub') userId: string): Promise<UserResponseDTO> {
    return this.getProfile.execute(userId);
  }
}
