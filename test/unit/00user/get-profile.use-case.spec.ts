import { NotFoundException } from '@nestjs/common';

import { GetProfileUseCase } from '@user/application/use-cases/get-profile.use-case';
import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRole } from '@common/user-role.enum';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('GetProfileUseCase', () => {
  it('devuelve el perfil si existe', async () => {
    const user = new User(
      'u1',
      new Email('foo@bar.com'),
      'hash',
      UserRole.USER,
    );
    const repo = { findById: jest.fn().mockResolvedValue(user) };
    const uc = new GetProfileUseCase(repo as any, makeLogger());

    const result = await uc.execute('u1');

    expect(result.id).toBe('u1');
    expect(result.email).toBe('foo@bar.com');
    expect(result.role).toBe(UserRole.USER);
  });

  it('lanza NotFound si no existe', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const uc = new GetProfileUseCase(repo as any, makeLogger());

    await expect(uc.execute('nope')).rejects.toThrow(NotFoundException);
  });
});
