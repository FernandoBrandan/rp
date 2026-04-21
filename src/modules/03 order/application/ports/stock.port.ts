export interface StockService {
  reserveStock(
    items: { productId: string; quantity: number }[],
    orderId: string,
  ): Promise<string>;
  confirmReservation(reservationId: string): Promise<void>;
  releaseReservation(reservationId: string): Promise<void>;
}
