import { UserRole } from '@common/user-role.enum';
import { Email } from './value-objects/email.vo';

interface IUser {
  id: string;
  email: Email;
  passwordHash: string;
  role: UserRole;
}

export class User implements IUser {
  constructor(
    public readonly id: string,
    public email: Email,
    public passwordHash: string,
    public role: UserRole,
  ) {}

  changeEmail(newEmail: Email) {
    this.email = newEmail;
  }

  changePassword(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.trim().length === 0) {
      throw new Error('Password hash cannot be empty');
    }
    this.passwordHash = newPasswordHash;
  }

  changeRole(newRole: UserRole) {
    this.role = newRole;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
