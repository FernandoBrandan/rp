// src/modules/01catalog/infra/adapters/stock-reservation.adapter.ts

import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';
import { StockPort } from '@order/application/ports/stock.port';
import { StockReservationEntity } from '../persistence/stock-reservation.orm-entity';
import { InsufficientStockException } from '@common/exceptions/insufficient-stock.exception';

@Injectable()
export class StockReservationAdapter implements StockPort {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StockReservationEntity)
    private readonly stockReservationRepo: Repository<StockReservationEntity>,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async reserveStock(
    items: { productId: string; quantity: number }[],
    orderId: string,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        const result = await manager
          .createQueryBuilder()
          .update('products')
          .set({
            stock: () => 'stock - :qty',
          })
          .where('id = :id')
          .andWhere('stock >= :qty')
          .setParameters({
            id: item.productId,
            qty: item.quantity,
          })
          .execute();
        if (result.affected === 0) {
          throw new InsufficientStockException(item.productId);
        }
      }

      const reservation = manager.create(StockReservationEntity, {
        orderId,
        items,
        status: 'RESERVED',
      });
      const saved = await manager.save(reservation);
      return saved.id;
    });
  }

  async confirmReservation(reservationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(StockReservationEntity, {
        where: { id: reservationId, status: 'RESERVED' },
      });
      if (!reservation)
        throw new Error(`Reservation ${reservationId} not found`);
      reservation.status = 'CONFIRMED';
      await manager.save(reservation);
      this.logger.info('Stock confirmed', { reservationId });
    });
  }

  async releaseReservation(reservationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(StockReservationEntity, {
        where: { id: reservationId, status: 'RESERVED' },
      });
      if (!reservation)
        throw new Error(`Reservation ${reservationId} not found`);
      for (const item of reservation.items) {
        await manager
          .createQueryBuilder()
          .update('products')
          .set({ stock: () => `stock + ${item.quantity}` })
          .where('id = :id', { id: item.productId })
          .execute();
      }
      reservation.status = 'RELEASED';
      await manager.save(reservation);
      this.logger.info('Stock released', { reservationId });
    });
  }
}
