// src/modules/01catalog/infra/persistence/stock-reservation.orm-entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ReservationStatus = 'RESERVED' | 'CONFIRMED' | 'RELEASED';

@Entity('stock_reservations')
export class StockReservationEntity {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ type: 'varchar' })
  orderId: string;

  @Column('json')
  items: { productId: string; quantity: number }[];

  @Column({
    type: 'enum',
    enum: ['RESERVED', 'CONFIRMED', 'RELEASED'],
    default: 'RESERVED',
  })
  status: ReservationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
