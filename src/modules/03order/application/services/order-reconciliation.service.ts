import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens'

import { OrderRepository } from '@order/domain/repositories/order.repository'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'
import { StockPort } from '../ports/stock.port'

@Injectable()
export class OrderReconciliationService {
  private readonly enabled: boolean
  private readonly windowMs: number
  private readonly batchSize: number

  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orders: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stock: StockPort,

    @Inject(LOGGER)
    private readonly logger: Logger,

    config: ConfigService,
  ) {
    this.enabled = config.get<string>('RECONCILIATION_ENABLED', 'true') !== 'false'
    const minutes = Number(config.get<string>('RECONCILIATION_WINDOW_MINUTES', '60'))
    this.windowMs = minutes * 60 * 1000
    this.batchSize = Number(config.get<string>('RECONCILIATION_BATCH_SIZE', '50'))
  }

  /**
   * Órdenes PAID pero cuya reserva quedó RESERVED (no se confirmó por crash
   * o fallo intermedio) → confirmar.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'reconcile-paid-orders' })
  async reconcilePaidOrders(): Promise<void> {
    if (!this.enabled) return

    const since = new Date(Date.now() - this.windowMs)
    const candidates = await this.orders.findRecentByStatuses(
      [OrderStatus.PAID],
      since,
      this.batchSize,
    )

    if (candidates.length === 0) return

    let fixed = 0
    let scanned = 0

    for (const order of candidates) {
      if (!order.reservationId) continue
      scanned++

      try {
        const status = await this.stock.getReservationStatus(order.reservationId)

        if (status === 'CONFIRMED') continue // consistente, nada que hacer
        if (status === 'RELEASED') {
          // Invariante rota: PAID con reserva liberada. No lo arreglamos
          // automáticamente — requiere intervención (¿refund? ¿nueva reserva?).
          this.logger.error('Reconciliation: PAID with RELEASED reservation', {
            event: 'reconciliation_anomaly',
            orderId: order.id,
            reservationId: order.reservationId,
          })
          continue
        }
        if (status === null) {
          this.logger.error('Reconciliation: reservation not found', {
            event: 'reconciliation_anomaly',
            orderId: order.id,
            reservationId: order.reservationId,
          })
          continue
        }

        // status === 'RESERVED' → huérfano
        this.logger.warn('Reconciliation: confirming orphaned reservation', {
          event: 'reconciliation_confirm_reservation',
          orderId: order.id,
          reservationId: order.reservationId,
        })
        await this.stock.confirmReservation(order.reservationId)
        fixed++
      } catch (err) {
        this.logger.error('Reconciliation failed for PAID order', {
          event: 'reconciliation_error',
          kind: 'paid',
          orderId: order.id,
          reservationId: order.reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (fixed > 0) {
      this.logger.info('Reconciliation pass complete', {
        event: 'reconciliation_pass',
        kind: 'paid',
        scanned,
        fixed,
      })
    }
  }

  /**
   * Órdenes FAILED pero cuya reserva quedó RESERVED (el release falló)
   * → liberar.
   */
  @Cron(CronExpression.EVERY_MINUTE, { name: 'reconcile-failed-orders' })
  async reconcileFailedOrders(): Promise<void> {
    if (!this.enabled) return

    const since = new Date(Date.now() - this.windowMs)
    const candidates = await this.orders.findRecentByStatuses(
      [OrderStatus.FAILED],
      since,
      this.batchSize,
    )

    if (candidates.length === 0) return

    let fixed = 0
    let scanned = 0

    for (const order of candidates) {
      if (!order.reservationId) continue
      scanned++

      try {
        const status = await this.stock.getReservationStatus(order.reservationId)

        if (status === 'RELEASED') continue // consistente
        if (status === 'CONFIRMED') {
          // Invariante rota: FAILED con reserva confirmada. Tampoco lo
          // arreglamos solos — alguien cobró y hay que refundear.
          this.logger.error('Reconciliation: FAILED with CONFIRMED reservation', {
            event: 'reconciliation_anomaly',
            orderId: order.id,
            reservationId: order.reservationId,
          })
          continue
        }
        if (status === null) continue

        this.logger.warn('Reconciliation: releasing orphaned reservation', {
          event: 'reconciliation_release_reservation',
          orderId: order.id,
          reservationId: order.reservationId,
        })
        await this.stock.releaseReservation(order.reservationId)
        fixed++
      } catch (err) {
        this.logger.error('Reconciliation failed for FAILED order', {
          event: 'reconciliation_error',
          kind: 'failed',
          orderId: order.id,
          reservationId: order.reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (fixed > 0) {
      this.logger.info('Reconciliation pass complete', {
        event: 'reconciliation_pass',
        kind: 'failed',
        scanned,
        fixed,
      })
    }
  }
}
