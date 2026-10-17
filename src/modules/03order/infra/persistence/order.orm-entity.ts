import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('orders')
@Index('idx_orders_status_updatedAt', ['status', 'updatedAt'])
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string

  @Column()
  userId: string

  @Column({ type: 'varchar', unique: true })
  idempotencyKey: string

  @Column('json')
  items: { productId: string; quantity: number; price: number }[]

  @Column('float')
  total: number

  @Column({ type: 'varchar', length: 3 })
  currency: string

  @Column()
  status: string

  @Column()
  reservationId: string

  @Column({ default: 'PENDING' })
  paymentStatus: string

  @Column({ nullable: true })
  paymentUrl: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
