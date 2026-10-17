// src/infra/event-bus/adapters/rabbitmq-event-consumer.ts

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as amqp from 'amqplib'

import { LOGGER } from '@infra/tokens'
import { Logger } from '@infra/logger/logger.interface'
import { correlationStorage } from '@infra/logger/logger'

import { EventConsumerPort, MessageHandler, SubscribeOptions } from '../ports/event-consumer.port'

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>
type AmqpChannel = Awaited<ReturnType<AmqpConnection['createChannel']>>

const EXCHANGE_TYPE = 'topic' as const

@Injectable()
export class RabbitMQEventConsumer implements EventConsumerPort, OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnection | null = null
  private channel: AmqpChannel | null = null

  private readonly url: string
  private readonly exchange: string

  constructor(
    config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.url = config.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    this.exchange = config.get('RABBITMQ_EXCHANGE', 'ecommerce')
  }
  stop(): Promise<void> {
    throw new Error('El método no está implementado.')
  }
  isHealthy(): Promise<boolean> {
    throw new Error('El método no está implementado.')
  }

  async onModuleInit(): Promise<void> {
    await this.connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close()
    await this.connection?.close()
  }

  async subscribe<T extends object>(
    topic: string,
    options: SubscribeOptions,
    handler: MessageHandler<T>,
  ): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ consumer channel not available')

    const queue = options.queue
    const routingKey = options.routingKey ?? topic

    // Cola durable. Si ya existe, no hace nada.
    await this.channel.assertQueue(queue, { durable: true, autoDelete: false })

    // Bindear la cola al exchange con la routing key
    await this.channel.bindQueue(queue, this.exchange, routingKey)

    // Consume loop
    await this.channel.consume(
      queue,
      async (msg) => {
        if (!msg) return

        const payload = JSON.parse(msg.content.toString())
        const correlationId = msg.properties.correlationId

        // Correlación: heredar el correlationId del mensaje en el ALS
        const ctx = { correlationId: correlationId ?? 'no-correlation' }

        await correlationStorage.run(ctx, async () => {
          try {
            await handler(payload)
            this.channel!.ack(msg)
          } catch (err) {
            this.logger.error('Consumer handler failed', {
              event: 'consumer_handler_failed',
              topic,
              queue,
              error: err instanceof Error ? err.message : String(err),
            })
            // requeue=true: el mensaje vuelve a la cola y se reintenta
            this.channel!.nack(msg, false, true)
          }
        })
      },
      { noAck: false },
    )

    this.logger.info('Consumer subscribed', { topic, queue, routingKey })
  }

  private async connect(): Promise<void> {
    const connection = await amqp.connect(this.url)

    connection.on('error', (err) =>
      this.logger.error('RabbitMQ consumer connection error', { error: err.message }),
    )
    connection.on('close', () => this.logger.warn('RabbitMQ consumer connection closed'))

    const channel = await connection.createChannel()

    await channel.assertExchange(this.exchange, EXCHANGE_TYPE, {
      durable: true,
      autoDelete: false,
    })

    this.connection = connection
    this.channel = channel

    this.logger.info('RabbitMQ consumer connected', { exchange: this.exchange })
  }
}

// ─────────────────────────────────────────────────────────────
// TODO (Fase 3+):
//   - Reconexión automática con backoff
//   - prefetch(N) para backpressure (hoy: sin límite)
//   - DLX / DLQ: cuando un handler falla N veces, mandar a {queue}.dlq
//     en vez de requeue infinito (hoy: puede loopear para siempre)
//   - Retry in-process con backoff antes del nack
//   - isHealthy() para /health/ready
//   - Re-aplicar bindings tras reconexión
// ─────────────────────────────────────────────────────────────
