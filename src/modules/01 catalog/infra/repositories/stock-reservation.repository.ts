// modules/05 products/infra/repositories/stock-reservation.repository.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StockReservation } from '../persistence/stock-reservation.entity';

@Injectable()
export class StockReservationRepository extends Repository<StockReservation> {
  constructor(private dataSource: DataSource) {
    super(StockReservation, dataSource.createEntityManager());
  }
}
