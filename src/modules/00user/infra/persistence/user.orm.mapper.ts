import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRole } from '@common/user-role.enum';
import { UserEntity } from './user.orm-entity';

export class UserOrmMapper {
  static toDomain(orm: UserEntity): User {
    return new User(
      orm.id,
      new Email(orm.email),
      orm.passwordHash,
      orm.role as UserRole,
    );
  }

  static toPersistence(domain: User): Partial<UserEntity> {
    return {
      id: domain.id,
      email: domain.email.getValue(),
      passwordHash: domain.passwordHash,
      role: domain.role,
    };
  }
}
