import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, ORDER_REPOSITORY, REFUND_SERVICE, STOCK_SERVICE } from '@infra/tokens'

import { OrderRepository } from '@order/domain/repositories/order.repository'
import { OrderStatus } from '@order/domain/enums/orderStatus.enum'
import { StockPort } from '../ports/stock.port'
import { RefundPort } from '../ports/refund.port'
import { OrderMapper } from '../mappers/order.mapper'
import { OrderResponseDTO } from '../dto/response/order-response.dto'

@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stock: StockPort,

    @Inject(REFUND_SERVICE)
    private readonly refund: RefundPort,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, orderId: string): Promise<OrderResponseDTO> {
    const order = await this.orderRepo.getOrderDetail(orderId)
    if (!order) throw new NotFoundException(`Order ${orderId} not found`)

    // Ownership check: devolvemos 404 en vez de 403 para no filtrar existencia.
    if (order.userId !== userId) throw new NotFoundException(`Order ${orderId} not found`)

    // Idempotencia: si ya está cancelada, devolvemos sin re-compensar.
    if (order.status === OrderStatus.CANCELLED) {
      this.logger.debug('Order already cancelled, no-op', { orderId })
      return OrderMapper.toResponse(order)
    }

    // Transiciones inválidas: FAILED y COMPLETED no se cancelan.
    if (!order.canBeCancelled()) {
      throw new ConflictException(`Cannot cancel order in status ${order.status}`)
    }

    const wasPaid = order.status === OrderStatus.PAID
    const reservationId = order.reservationId

    // ── Paso 1: persistir la intención (dominio primero) ──────────
    order.cancelOrder()
    await this.orderRepo.update(order)

    this.logger.info('Order cancelled', {
      event: 'order_cancelled',
      orderId,
      userId,
      previousStatus: wasPaid ? OrderStatus.PAID : 'PRE_PAID',
    })

    // ── Paso 2: compensación best-effort (cron repara si falla) ────

    if (reservationId) {
      try {
        await this.stock.restockReservation(reservationId)
      } catch (err) {
        this.logger.error('Cancel: restock failed — reconciliation will retry', {
          event: 'cancel_restock_failed',
          orderId,
          reservationId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    if (wasPaid) {
      try {
        await this.refund.refund({
          orderId,
          amount: order.total.toNumber(),
          currency: order.currency.toString(), // ← NUEVO (si tu RefundInput lo soporta)
          reason: 'user_cancelled_paid_order',
        })
      } catch (err) {
        this.logger.error('Cancel: refund failed', {
          event: 'cancel_refund_failed',
          orderId,
          amount: order.total.toNumber(),
          error: err instanceof Error ? err.message : String(err),
        })
        // Nota: sin payments table (Fase 3), el cron no puede reconciliar esto.
        // En MVP aceptamos el riesgo porque el stub es log-only y no falla.
      }
    }

    return OrderMapper.toResponse(order)
  }
}
