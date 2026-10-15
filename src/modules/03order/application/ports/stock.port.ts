// src/modules/03order/application/ports/stock.port.ts

import { ReservationStatus } from '@main/modules/01catalog/infra/persistence/stock-reservation.orm-entity'

export interface StockPort {
  reserveStock(items: { productId: string; quantity: number }[], orderId: string): Promise<string>
  confirmReservation(reservationId: string): Promise<void>
  releaseReservation(reservationId: string): Promise<void>

  /** Devuelve el estado, o null si la reserva no existe. */
  getReservationStatus(reservationId: string): Promise<ReservationStatus | null>

  /**
   * Devuelve stock al pool desde una reserva RESERVED o CONFIRMED.
   * Idempotente: si ya está RELEASED, no-op.
   * Falla si la reserva no existe.
   *
   * Semánticamente distinto de releaseReservation:
   *   - releaseReservation: sólo RESERVED (flujo de pago fallido, invariante estricta)
   *   - restockReservation: RESERVED | CONFIRMED (flujo de cancelación, devuelve stock ya vendido)
   */
  restockReservation(reservationId: string): Promise<void>
}
