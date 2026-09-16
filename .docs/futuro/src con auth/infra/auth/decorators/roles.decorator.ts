import { SetMetadata } from '@nestjs/common';

import { typeRole } from '../../../shared/common/role.enum';
import { ROLES_KEY } from '../guards/roles.guard';

export const Roles = (...roles: typeRole[]) => SetMetadata(ROLES_KEY, roles);
