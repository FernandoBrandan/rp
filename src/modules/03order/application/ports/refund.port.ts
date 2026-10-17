export interface RefundInput {
  orderId: string
  amount: number
  currency: string
  reason: string
}

export interface RefundResult {
  refundId: string
}

export interface RefundPort {
  /**
   * Emite un reembolso al medio de pago original.
   * En Fase 3 esto llama al provider real (MercadoPago refund API).
   * En MVP es un log stub — siempre exitoso.
   */
  refund(input: RefundInput): Promise<RefundResult>
}
