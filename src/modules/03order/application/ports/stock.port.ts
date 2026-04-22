// src/modules/03order/application/ports/stock.port.ts

export interface StockPort {
  reserveStock(
    items: { productId: string; quantity: number }[],
    orderId: string,
  ): Promise<string>;
  confirmReservation(reservationId: string): Promise<void>;
  releaseReservation(reservationId: string): Promise<void>;
}
