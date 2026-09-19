import { User } from '../user.entity';
import { Email } from '../value-objects/email.vo';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}
