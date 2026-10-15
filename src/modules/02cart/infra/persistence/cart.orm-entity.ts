// src/modules/02cart/infra/persistence/cart.orm-entity.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('carts')
export class CartOrmEntity {
  @PrimaryColumn()
  userId: string

  @Column('json')
  items: { productId: string; quantity: number }[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
