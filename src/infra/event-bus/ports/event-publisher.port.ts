// src/modules/03order/application/ports/event-publisher.port.ts

export interface PublishOptions {
  /** Se propaga como `correlationId` de AMQP. Útil para trazar cross-service. */
  correlationId?: string
}

export interface EventPublisherPort {
  /**
   * Publica un evento de dominio al bus.
   * El adapter decide el transporte (in-memory, RabbitMQ, Kafka, etc).
   *
   * topic: string estable y versionable. Ej: 'order.created' o 'order.created.v1'
   * payload: DTO plano, serializable, autocontenido.
   */
  publish<T extends object>(topic: string, payload: T, options?: PublishOptions): Promise<void>
}
