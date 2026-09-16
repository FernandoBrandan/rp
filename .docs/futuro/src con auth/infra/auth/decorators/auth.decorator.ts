import { applyDecorators, UseGuards } from '@nestjs/common';
import { typeRole } from '../../../shared/common/role.enum';
import { AuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export const Auth = (...roles: typeRole[]) => {
  return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard));
};
