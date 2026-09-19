import { TestDatabase } from './postgres-container';
import { TypeOrmUserRepository } from '@user/infra/repositories/typeorm-user.repository';
import { UserEntity } from '@user/infra/persistence/user.orm-entity';
import { User } from '@user/domain/user.entity';
import { Email } from '@user/domain/value-objects/email.vo';
import { UserRole } from '@common/user-role.enum';
import { randomUUID } from 'crypto';

describe('TypeOrmUserRepository (integration)', () => {
  let db: TestDatabase;
  let repo: TypeOrmUserRepository;

  beforeAll(async () => {
    db = new TestDatabase();
    await db.start();
    repo = new TypeOrmUserRepository(db.dataSource.getRepository(UserEntity));
  }, 60_000);

  beforeEach(async () => {
    await db.clear();
  });

  afterAll(async () => {
    await db.stop();
  });

  function makeUser(email = 'foo@bar.com', role = UserRole.USER): User {
    return new User(randomUUID(), new Email(email), 'hashed', role);
  }

  it('guarda y recupera por id', async () => {
    const user = makeUser();
    await repo.save(user);

    const found = await repo.findById(user.id);

    expect(found).not.toBeNull();
    expect(found.email.getValue()).toBe('foo@bar.com');
    expect(found.role).toBe(UserRole.USER);
  });

  it('findByEmail devuelve null si no existe', async () => {
    const found = await repo.findByEmail(new Email('no@existe.com'));
    expect(found).toBeNull();
  });

  it('findByEmail encuentra por email normalizado', async () => {
    await repo.save(makeUser('foo@bar.com'));

    const found = await repo.findByEmail(new Email('FOO@BAR.COM'));

    expect(found).not.toBeNull();
    expect(found.email.getValue()).toBe('foo@bar.com');
  });

  it('falla si el email ya existe (unique constraint)', async () => {
    await repo.save(makeUser('foo@bar.com'));

    await expect(repo.save(makeUser('foo@bar.com'))).rejects.toThrow();
  });
});
