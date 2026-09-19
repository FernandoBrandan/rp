import { ConflictException } from '@nestjs/common';

import { RegisterUseCase } from '@auth/application/use-cases/register.use-case';
import { UserRole } from '@common/user-role.enum';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeHash() {
  return { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() };
}

describe('RegisterUseCase', () => {
  it('crea el user con rol USER', async () => {
    const userFinder = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'foo@bar.com',
        passwordHash: 'hashed',
        role: UserRole.USER,
      }),
    };
    const uc = new RegisterUseCase(userFinder as any, makeHash(), makeLogger());

    const result = await uc.execute({
      email: 'foo@bar.com',
      password: 'Password123',
    });

    expect(result.email).toBe('foo@bar.com');
    expect(userFinder.create).toHaveBeenCalledWith({
      email: 'foo@bar.com',
      passwordHash: 'hashed',
      role: UserRole.USER,
    });
  });

  it('lanza Conflict si el email ya existe', async () => {
    const userFinder = {
      findByEmail: jest.fn().mockResolvedValue({ id: 'u1' }),
      create: jest.fn(),
    };
    const uc = new RegisterUseCase(userFinder as any, makeHash(), makeLogger());

    await expect(
      uc.execute({ email: 'foo@bar.com', password: 'Password123' }),
    ).rejects.toThrow(ConflictException);
    expect(userFinder.create).not.toHaveBeenCalled();
  });

  it('normaliza email a lowercase', async () => {
    const userFinder = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'foo@bar.com',
        passwordHash: 'h',
        role: UserRole.USER,
      }),
    };
    const uc = new RegisterUseCase(userFinder as any, makeHash(), makeLogger());

    await uc.execute({ email: 'FOO@BAR.COM', password: 'Password123' });

    expect(userFinder.findByEmail).toHaveBeenCalledWith('foo@bar.com');
  });
});
