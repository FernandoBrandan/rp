import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', unique: true })
  idempotencyKey: string;

  @Column('json')
  items: { productId: string; quantity: number; price: number }[];

  @Column('float')
  total: number;

  @Column()
  status: string;

  @Column()
  reservationId: string;

  @Column({ default: 'PENDING' })
  paymentStatus: string;

  @Column({ nullable: true })
  paymentUrl: string;
}
