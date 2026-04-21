// modules/05 products/infra/services/stock-validate.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Logger } from '@infra/logger/logger.interface';
import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';

import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { StockReservation } from '@catalog/infra/persistence/stock-reservation.entity';
import { StockService } from '@order/application/ports/stock.port';

@Injectable()
export class StockValidate implements StockService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(StockReservation)
    private readonly stockReservationRepo: Repository<StockReservation>,

    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async reserveStock(
    items: { productId: string; quantity: number }[],
    orderId: string,
  ): Promise<string> {
    return this.dataSource.transaction(async (manager) => {
      // Descontar stock de cada producto
      for (const item of items) {
        const result = await manager
          .createQueryBuilder()
          .update('products') // nombre real de tu tabla de productos
          .set({ stock: () => `stock - ${item.quantity}` })
          .where('id = :id AND stock >= :qty', {
            id: item.productId,
            qty: item.quantity,
          })
          .execute();

        if (result.affected === 0) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }

      // Crear reserva
      const reservation = manager.create(StockReservation, {
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
      const reservation = await manager.findOne(StockReservation, {
        where: { id: reservationId, status: 'RESERVED' },
      });
      if (!reservation) {
        throw new Error(
          `Reservation ${reservationId} not found or already processed`,
        );
      }
      reservation.status = 'CONFIRMED';
      await manager.save(reservation);
      this.logger.info('Stock confirmed', {
        reservationId,
        orderId: reservation.orderId,
      });
    });
  }

  async releaseReservation(reservationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const reservation = await manager.findOne(StockReservation, {
        where: { id: reservationId, status: 'RESERVED' },
      });
      if (!reservation) {
        throw new Error(
          `Reservation ${reservationId} not found or already processed`,
        );
      }

      // Devolver stock
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
      this.logger.info('Stock released', {
        reservationId,
        orderId: reservation.orderId,
      });
    });
  }
}
