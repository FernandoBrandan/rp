// src/infra/event-bus/adapters/rabbitmq-event-publisher.ts

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as amqp from 'amqplib'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { correlationStorage } from '@infra/logger/logger'
import { EventPublisherPort, PublishOptions } from '../ports/event-publisher.port'

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>
type AmqpConfirmChannel = Awaited<ReturnType<AmqpConnection['createConfirmChannel']>>

const EXCHANGE_TYPE = 'topic' as const

@Injectable()
export class RabbitMQEventPublisher implements EventPublisherPort, OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnection | null = null
  private channel: AmqpConfirmChannel | null = null

  private readonly url: string
  private readonly exchange: string

  constructor(
    config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.url = config.get('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    this.exchange = config.get('RABBITMQ_EXCHANGE', 'ecommerce')
  }

  async onModuleInit(): Promise<void> {
    await this.connect()
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close()
    await this.connection?.close()
  }

  async publish<T extends object>(
    topic: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<void> {
    if (!this.channel) throw new Error('RabbitMQ channel not available')

    const correlationId = options?.correlationId ?? correlationStorage.getStore()?.correlationId

    const content = Buffer.from(JSON.stringify(payload))

    // ConfirmChannel: el callback confirma que el broker recibió el mensaje
    await new Promise<void>((resolve, reject) => {
      this.channel!.publish(
        this.exchange,
        topic,
        content,
        {
          persistent: true,
          contentType: 'application/json',
          correlationId,
          timestamp: Date.now(),
        },
        (err) => (err ? reject(err) : resolve()),
      )
    })

    this.logger.debug('Event published', {
      event: 'event_published',
      topic,
      correlationId,
    })
  }

  private async connect(): Promise<void> {
    const connection = await amqp.connect(this.url)

    connection.on('error', (err) =>
      this.logger.error('RabbitMQ connection error', { error: err.message }),
    )
    connection.on('close', () => this.logger.warn('RabbitMQ connection closed'))

    const channel = await connection.createConfirmChannel()

    await channel.assertExchange(this.exchange, EXCHANGE_TYPE, {
      durable: true,
      autoDelete: false,
    })

    this.connection = connection
    this.channel = channel

    this.logger.info('RabbitMQ publisher connected', { exchange: this.exchange })
  }
}

// ─────────────────────────────────────────────────────────────
// TODO (Fase 3+):
//   - Reconexión automática con backoff exponencial
//     (hoy: si RabbitMQ se cae, el proceso queda sin channel hasta restart)
//   - isHealthy() para /health/ready
//   - PublishOptions.delayMs (requiere delayed exchange o TTL+DLX)
// ─────────────────────────────────────────────────────────────
