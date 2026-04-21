import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('carts')
export class CartOrmEntity {
  @PrimaryColumn()
  userId: string;

  @Column('json')
  items: { productId: string; quantity: number }[];
}
