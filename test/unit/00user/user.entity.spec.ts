import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRole } from '@common/user-role.enum';

function makeUser() {
  return new User(
    'user-1',
    new Email('foo@bar.com'),
    'hashed-password',
    UserRole.USER,
  );
}

describe('User', () => {
  it('cambia email', () => {
    const user = makeUser();
    user.changeEmail(new Email('new@bar.com'));
    expect(user.email.getValue()).toBe('new@bar.com');
  });

  it('rechaza passwordHash vacío', () => {
    const user = makeUser();
    expect(() => user.changePassword('')).toThrow(
      'Password hash cannot be empty',
    );
    expect(() => user.changePassword('   ')).toThrow(
      'Password hash cannot be empty',
    );
  });

  it('isAdmin() refleja el rol', () => {
    const user = makeUser();
    expect(user.isAdmin()).toBe(false);
    user.changeRole(UserRole.ADMIN);
    expect(user.isAdmin()).toBe(true);
  });
});
