import { UnauthorizedException } from '@nestjs/common';

import { LoginUseCase } from '@auth/application/use-cases/login.use-case';
import { UserRole } from '@common/user-role.enum';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('LoginUseCase', () => {
  const user = {
    id: 'u1',
    email: 'foo@bar.com',
    passwordHash: 'hashed',
    role: UserRole.USER,
  };

  it('devuelve token si las credenciales son válidas', async () => {
    const userFinder = { findByEmail: jest.fn().mockResolvedValue(user) };
    const hash = { compare: jest.fn().mockResolvedValue(true) };
    const jwt = { sign: jest.fn().mockReturnValue('jwt-token') };

    const uc = new LoginUseCase(
      userFinder as any,
      hash as any,
      jwt as any,
      makeLogger(),
    );

    const result = await uc.execute({
      email: 'foo@bar.com',
      password: 'Password123',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(result.user.id).toBe('u1');
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'foo@bar.com',
      role: UserRole.USER,
    });
  });

  it('lanza Unauthorized si el user no existe', async () => {
    const userFinder = { findByEmail: jest.fn().mockResolvedValue(null) };
    const hash = { compare: jest.fn() };
    const jwt = { sign: jest.fn() };

    const uc = new LoginUseCase(
      userFinder as any,
      hash as any,
      jwt as any,
      makeLogger(),
    );

    await expect(
      uc.execute({ email: 'foo@bar.com', password: 'x' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('lanza Unauthorized si la password es incorrecta', async () => {
    const userFinder = { findByEmail: jest.fn().mockResolvedValue(user) };
    const hash = { compare: jest.fn().mockResolvedValue(false) };
    const jwt = { sign: jest.fn() };

    const uc = new LoginUseCase(
      userFinder as any,
      hash as any,
      jwt as any,
      makeLogger(),
    );

    await expect(
      uc.execute({ email: 'foo@bar.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
