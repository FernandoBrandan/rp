// src/modules/identity/infra/persistence/user.orm-entity.ts
import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  role: string;
}
