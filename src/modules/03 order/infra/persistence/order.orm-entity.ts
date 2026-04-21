import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: string;

  @Column()
  idempotencyKey: string;

  @Column('json')
  items: { productId: string; quantity: number; price: number }[];

  @Column('float')
  total: number;

  @Column()
  status: string;

  @Column({ nullable: true })
  paymentUrl: string;

  @Column()
  reservationId: string;
}
