import { Email } from './value-objects/emails.vo';

export type UserRole = 'USER' | 'ADMIN';

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

  changePassword(newPasswordHash: string) {
    this.passwordHash = newPasswordHash;
  }

  changeRole(newRole: UserRole) {
    this.role = newRole;
  }
}
