// src/infra/event-bus/ports/event-consumer.port.ts

export interface SubscribeOptions {
  /** Nombre de la cola durable. Ej: 'order.consumer.paid' */
  queue: string
  /** Routing key a bindear. Default: el mismo topic pasado a subscribe(). */
  routingKey?: string
  /** Mensajes sin ack que el broker entrega a la vez. Default: 10 */
  prefetch?: number
  /** Reintentos in-process antes de mandar a DLQ. Default: 3 */
  maxRetries?: number
  /** Base del backoff. Default: 500ms */
  retryBaseMs?: number
}

export type MessageHandler<T> = (payload: T) => Promise<void>

export interface EventConsumerPort {
  subscribe<T extends object>(
    topic: string,
    options: SubscribeOptions,
    handler: MessageHandler<T>,
  ): Promise<void>

  /** Cierra conexiones. Se llama en onModuleDestroy. */
  stop(): Promise<void>

  /** Estado de la conexión. */
  isHealthy(): Promise<boolean>
}
