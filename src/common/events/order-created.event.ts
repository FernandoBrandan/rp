// src/modules/03order/domain/events/order-created.event.ts

export interface OrderCreatedItem {
  productId: string
  quantity: number
  price: number
}

/**
 * Evento: una orden fue creada y su stock reservado.
 * Consumido por Payment (servicio externo) para generar el link de pago.
 *
 * INVARIANTE: este payload es autocontenido. Payment NO consulta la DB de Order.
 */
export interface OrderCreatedEvent {
  readonly orderId: string
  readonly userId: string
  readonly total: number
  readonly currency: string
  readonly items: readonly OrderCreatedItem[]
  readonly occurredAt: string // ISO 8601
}
