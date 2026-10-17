// shared/topics.ts
// ─────────────────────────────────────────────────────────────
// Topics globales del sistema. Copiar literal en todos los servicios.
//
// Convención: <productor>.<entidad>.<acción>
//   - El prefijo es QUIÉN PRODUCE el hecho, no quién lo consume.
//   - El consumidor escucha con el mismo string literal.
//
// Reglas:
//   1. Nunca cambiar un topic existente (rompe consumers en vuelo).
//   2. Para evolucionar, agregar un topic nuevo (ej: `order.created.v2`).
//   3. Este archivo es la fuente única. Si hay que agregar uno, se agrega acá
//      y se copia en el resto de los repos.
// ─────────────────────────────────────────────────────────────

export const Topics = {
  // ── Producidos por ECOMMERCE ──────────────────────────────
  /** ECO → PAY: orden creada, esperando link de pago. */
  ORDER_CREATED: 'ecommerce.order.created',
  /** ECO → PAY: orden cancelada, requiere refund. (futuro) */
  ORDER_CANCELLED: 'ecommerce.order.cancelled',

  // ── Producidos por PAYMENT ────────────────────────────────
  /** PAY → ECO: link de pago generado y listo. */
  PAYMENT_LINK_CREATED: 'payment.link.created',
  /** PAY → ECO: pago confirmado por el provider. */
  PAYMENT_APPROVED: 'payment.approved',
  /** PAY → ECO: pago rechazado por el provider. */
  PAYMENT_REJECTED: 'payment.rejected',
  /** PAY → ECO: pago devuelto. */
  PAYMENT_REFUNDED: 'payment.refunded',
} as const

export type Topic = (typeof Topics)[keyof typeof Topics]
