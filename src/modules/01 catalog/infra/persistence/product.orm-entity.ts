import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('products')
export class ProductEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  serial: string;

  @Column()
  name: string;

  @Column('float')
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column()
  status: string;
}
