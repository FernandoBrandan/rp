// modules/05 products/infra/repositories/stock-reservation.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockReservationEntity } from '../persistence/stock-reservation.orm-entity';

@Injectable()
export class StockReservationRepository extends Repository<StockReservationEntity> {
  constructor(private dataSource: DataSource) {
    super(StockReservationEntity, dataSource.createEntityManager());
  }
}
