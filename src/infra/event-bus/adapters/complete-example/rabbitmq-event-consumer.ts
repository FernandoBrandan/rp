// src/infra/event-bus/adapters/rabbitmq-event-consumer.ts

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as amqp from 'amqplib'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { correlationStorage } from '@infra/logger/logger'
import {
  EventConsumerPort,
  MessageHandler,
  SubscribeOptions,
} from '../../ports/event-consumer.port'

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>

const EXCHANGE_TYPE = 'topic' as const
const DLX_SUFFIX = '.dlx'

interface Registration {
  topic: string
  options: Required<SubscribeOptions>
  handler: MessageHandler<any>
}

@Injectable()
export class RabbitMQEventConsumer implements EventConsumerPort, OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnection | null = null
  private channel: AmqpChannel | null = null
  private connecting: Promise<void> | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isShuttingDown = false

  private readonly url: string
  private readonly exchange: string
  private readonly dlx: string
  private readonly registrations: Registration[] = []

  constructor(
    config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.url = config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    this.exchange = config.get<string>('RABBITMQ_EXCHANGE', 'ecommerce')
    this.dlx = this.exchange + DLX_SUFFIX
  }

  stop(): Promise<void> {
    throw new Error('El método no está implementado.')
  }

  // ─── Lifecycle ─────────────────────────────────────────────
  async onModuleInit(): Promise<void> {
    try {
      await this.connect()
    } catch (err) {
      this.logger.error('Initial RabbitMQ consumer connection failed — will retry', {
        event: 'rabbitmq_consumer_connect_failed',
        error: err instanceof Error ? err.message : String(err),
      })
      this.scheduleReconnect()
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    try {
      await this.channel?.close()
      await this.connection?.close()
    } catch (err) {
      this.logger.warn('Error closing RabbitMQ consumer gracefully', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ─── Subscribe ─────────────────────────────────────────────
  async subscribe<T extends object>(
    topic: string,
    options: SubscribeOptions,
    handler: MessageHandler<T>,
  ): Promise<void> {
    const opts: Required<SubscribeOptions> = {
      queue: options.queue,
      routingKey: options.routingKey ?? topic,
      prefetch: options.prefetch ?? 10,
      maxRetries: options.maxRetries ?? 3,
      retryBaseMs: options.retryBaseMs ?? 500,
    }

    const reg: Registration = { topic, options: opts, handler: handler as MessageHandler<any> }

    // Guardamos el registro aunque no haya conexión todavía.
    // Cuando conecte (o reconecte), se aplican todos los bindings.
    this.registrations.push(reg)

    if (this.channel) {
      await this.applyRegistration(reg)
    }

    this.logger.info('Event consumer registered', {
      event: 'event_consumer_registered',
      topic,
      queue: opts.queue,
      routingKey: opts.routingKey,
    })
  }

  // ─── Health ────────────────────────────────────────────────
  async isHealthy(): Promise<boolean> {
    if (!this.connection || !this.channel) return false
    try {
      await this.channel.checkExchange(this.exchange)
      return true
    } catch {
      return false
    }
  }

  // ─── Connection ────────────────────────────────────────────
  private async connect(): Promise<void> {
    if (this.connecting) return this.connecting
    this.connecting = this.doConnect()
    try {
      await this.connecting
    } finally {
      this.connecting = null
    }
  }

  private async doConnect(): Promise<void> {
    this.logger.info('Connecting RabbitMQ consumer', { url: this.redact(this.url) })

    const connection = await amqp.connect(this.url)
    connection.on('error', (err) =>
      this.logger.error('RabbitMQ consumer connection error', { error: err.message }),
    )
    connection.on('close', () => {
      this.connection = null
      this.channel = null
      if (!this.isShuttingDown) {
        this.logger.warn('RabbitMQ consumer connection closed — scheduling reconnect')
        this.scheduleReconnect()
      }
    })

    const channel = await connection.createChannel()
    channel.on('error', (err) =>
      this.logger.error('RabbitMQ consumer channel error', { error: err.message }),
    )

    // 1. Declarar exchange principal (idempotente)
    await channel.assertExchange(this.exchange, EXCHANGE_TYPE, {
      durable: true,
      autoDelete: false,
    })

    // 2. Declarar DLX (Dead Letter Exchange)
    await channel.assertExchange(this.dlx, 'direct', {
      durable: true,
      autoDelete: false,
    })

    this.connection = connection
    this.channel = channel
    this.reconnectAttempts = 0

    // 3. Aplicar todos los bindings registrados hasta ahora
    for (const reg of this.registrations) {
      await this.applyRegistration(reg)
    }

    this.logger.info('RabbitMQ consumer connected', {
      exchange: this.exchange,
      dlx: this.dlx,
      registrations: this.registrations.length,
    })
  }

  /**
   * Declara la cola, su DLQ, los bindings, y arranca el consume loop.
   * Idempotente: se puede llamar en cada reconexión.
   */
  private async applyRegistration(reg: Registration): Promise<void> {
    const channel = this.channel!
    const { queue, routingKey, prefetch, maxRetries, retryBaseMs } = reg.options
    const dlq = queue + '.dlq'

    // Cola principal con DLX configurado
    await channel.assertQueue(queue, {
      durable: true,
      autoDelete: false,
      arguments: {
        'x-dead-letter-exchange': this.dlx,
        'x-dead-letter-routing-key': queue, // el DLX rutea por nombre de cola origen
      },
    })

    // Cola de DLQ (compañera)
    await channel.assertQueue(dlq, { durable: true, autoDelete: false })

    // Bindings
    await channel.bindQueue(queue, this.exchange, routingKey)
    await channel.bindQueue(dlq, this.dlx, queue)

    // Prefetch (QoS): cuántos mensajes sin ack recibe este consumidor
    await channel.prefetch(prefetch)

    // Consume loop
    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return // null = consumer cancelado por el broker

        const payload = JSON.parse(msg.content.toString())
        const correlationId = msg.properties.correlationId

        // Correlación: meter el correlationId del mensaje en el ALS
        // para que todos los logs internos del handler lo lleven.
        const ctx = { correlationId: correlationId ?? 'no-correlation' }

        correlationStorage.run(ctx, async () => {
          try {
            await this.runWithRetries(reg, payload, maxRetries, retryBaseMs)
            channel.ack(msg)
          } catch (err) {
            this.logger.error('Handler failed — sending to DLQ', {
              event: 'consumer_handler_exhausted',
              topic: reg.topic,
              queue,
              error: err instanceof Error ? err.message : String(err),
            })
            // nack con requeue=false → va al DLX → DLQ
            channel.nack(msg, false, false)
          }
        })
      },
      { noAck: false },
    )
  }

  private async runWithRetries(
    reg: Registration,
    payload: any,
    maxRetries: number,
    retryBaseMs: number,
  ): Promise<void> {
    let lastErr: unknown
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await reg.handler(payload)
        return
      } catch (err) {
        lastErr = err
        if (attempt === maxRetries) break
        const delay = retryBaseMs * 2 ** (attempt - 1)
        this.logger.warn('Handler failed — retrying', {
          event: 'consumer_handler_retry',
          topic: reg.topic,
          attempt,
          delayMs: delay,
        })
        await new Promise((r) => setTimeout(r, delay))
      }
    }
    throw lastErr
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return
    if (this.reconnectTimer) return

    this.reconnectAttempts++
    const delayMs = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30_000)

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (err) {
        this.logger.error('RabbitMQ consumer reconnect failed', {
          attempt: this.reconnectAttempts,
          error: err instanceof Error ? err.message : String(err),
        })
        this.scheduleReconnect()
      }
    }, delayMs)
    this.reconnectTimer.unref?.()
  }

  private redact(url: string): string {
    return url.replace(/\/\/[^@]+@/, '//***@')
  }
}
