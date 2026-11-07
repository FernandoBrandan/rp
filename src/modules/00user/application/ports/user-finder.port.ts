export interface UserSnapshot {
  id: string;
  email: string;
  passwordHash: string;
  role: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: string;
}

export interface UserFinderPort {
  findById(id: string): Promise<UserSnapshot | null>;
  findByEmail(email: string): Promise<UserSnapshot | null>;
  create(input: CreateUserInput): Promise<UserSnapshot>;
}
