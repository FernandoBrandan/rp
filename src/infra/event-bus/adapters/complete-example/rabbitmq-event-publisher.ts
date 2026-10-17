// src/infra/event-bus/adapters/rabbitmq-event-publisher.ts

import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID } from 'crypto'
import * as amqp from 'amqplib'

import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { EventPublisherPort, PublishOptions } from '../../ports/event-publisher.port'
import { EventPublisherHealthPort } from '../../ports/event-publisher-health.port'

import { correlationStorage } from '@infra/logger/logger'

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>
type AmqpConfirmChannel = Awaited<ReturnType<AmqpConnection['createConfirmChannel']>>
const EXCHANGE_TYPE = 'topic' as const

/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │  RabbitMQEventPublisher                                     │
 * │  ─────────────────────────────────────────────────────────  │
 * │  Implementa: EventPublisherPort                             │
 * │  Ciclo de vida: OnModuleInit · OnModuleDestroy              │
 * │                                                             │
 * │  API pública:                                               │
 * │    • publish(topic, payload, opts?) → Promise<void>         │
 * │    • isHealthy() → Promise<boolean>                         │
 * │                                                             │
 * │  Estado interno (no expuesto):                              │
 * │    • connection: ChannelModel | null                        │
 * │    • channel: ConfirmChannel | null                         │
 * │    • reconnect con backoff exponencial (1s → 30s)           │
 * │                                                             │
 * │  Responsabilidad:                                           │
 * │    - Conectar/Reconectar al broker                          │
 * │    - Declarar exchange (topic, durable)                     │
 * │    - Publicar con confirmación del broker                   │
 * │    - Propagar correlationId como propiedad AMQP             │
 * │                                                             │
 * │  NO responsabilidad:                                        │
 * │    - Interpretar el payload                                 │
 * │    - Decidir routing keys (eso lo hace el caller)           │
 * │    - Consumir mensajes (eso es otro adapter)                │
 * └─────────────────────────────────────────────────────────────┘
 */

@Injectable()
export class RabbitMQEventPublisher
  implements EventPublisherPort, EventPublisherHealthPort, OnModuleInit, OnModuleDestroy
{
  private connection: AmqpConnection | null = null
  private channel: AmqpConfirmChannel | null = null
  private connecting: Promise<void> | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private isShuttingDown = false

  private readonly url: string
  private readonly exchange: string

  constructor(
    config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {
    this.url = config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
    this.exchange = config.get<string>('RABBITMQ_EXCHANGE', 'ecommerce')
  }

  // ─── Lifecycle ─────────────────────────────────────────────────
  async onModuleInit(): Promise<void> {
    try {
      await this.connect()
    } catch (err) {
      // No abortamos el arranque: la app puede servir requests mientras
      // RabbitMQ no está. publish() va a fallar y el use case lo loguea.
      this.logger.error('Initial RabbitMQ connection failed — will retry', {
        event: 'rabbitmq_connect_failed',
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
      this.logger.warn('Error closing RabbitMQ gracefully', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ─── Publish ───────────────────────────────────────────────────
  async publish<T extends object>(
    topic: string,
    payload: T,
    options?: PublishOptions,
  ): Promise<void> {
    const channel = this.channel
    if (!channel) {
      throw new Error('RabbitMQ channel not available')
    }

    const correlationId = options?.correlationId ?? correlationStorage.getStore()?.correlationId

    const content = Buffer.from(JSON.stringify(payload))

    // ConfirmChannel: el callback nos avisa si el broker confirmó (ok)
    // o rechazó (err). Esto da garantía de entrega real.
    await new Promise<void>((resolve, reject) => {
      channel.publish(
        this.exchange,
        topic,
        content,
        {
          persistent: true, // sobrevive restart del broker
          contentType: 'application/json',
          messageId: randomUUID(),
          correlationId, // ← propiedad AMQP nativa
          timestamp: Date.now(),
          headers: {
            'x-occurred-at': new Date().toISOString(),
          },
        },
        (err) => (err ? reject(err) : resolve()),
      )
    })

    this.logger.debug('Event published', {
      event: 'event_published',
      transport: 'rabbitmq',
      exchange: this.exchange,
      topic,
      correlationId: options?.correlationId,
    })
  }

  // ─── Health ────────────────────────────────────────────────
  async isHealthy(): Promise<boolean> {
    if (!this.connection || !this.channel) return false
    try {
      // checkExchange NO crea nada. Solo verifica que existe y que el canal vive.
      await this.channel.checkExchange(this.exchange)
      return true
    } catch {
      return false
    }
  }

  // ─── Connection management ─────────────────────────────────────
  private async connect(): Promise<void> {
    // Evita conexiones concurrentes si publish() y reconnect() pegan juntos
    if (this.connecting) return this.connecting

    this.connecting = this.doConnect()
    try {
      await this.connecting
    } finally {
      this.connecting = null
    }
  }

  private async doConnect(): Promise<void> {
    this.logger.info('Connecting to RabbitMQ', { url: this.redact(this.url) })

    const connection = await amqp.connect(this.url)
    connection.on('error', (err) => {
      this.logger.error('RabbitMQ connection error', { error: err.message })
    })
    connection.on('close', () => {
      this.connection = null
      this.channel = null
      if (!this.isShuttingDown) {
        this.logger.warn('RabbitMQ connection closed — scheduling reconnect')
        this.scheduleReconnect()
      }
    })

    const channel = await connection.createConfirmChannel()
    channel.on('error', (err) => {
      this.logger.error('RabbitMQ channel error', { error: err.message })
    })

    // Idempotente: crea si no existe, no hace nada si ya existe con mismo tipo
    await channel.assertExchange(this.exchange, EXCHANGE_TYPE, {
      durable: true,
      autoDelete: false,
    })

    this.connection = connection
    this.channel = channel
    this.reconnectAttempts = 0

    this.logger.info('RabbitMQ connected', {
      exchange: this.exchange,
      type: EXCHANGE_TYPE,
    })
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return
    if (this.reconnectTimer) return

    this.reconnectAttempts++
    const delayMs = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30_000)

    this.logger.info('RabbitMQ reconnect scheduled', {
      attempt: this.reconnectAttempts,
      delayMs,
    })

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect()
      } catch (err) {
        this.logger.error('RabbitMQ reconnect failed', {
          attempt: this.reconnectAttempts,
          error: err instanceof Error ? err.message : String(err),
        })
        this.scheduleReconnect()
      }
    }, delayMs)
    this.reconnectTimer.unref?.()
  }

  private redact(url: string): string {
    // amqp://user:pass@host → amqp://***@host
    return url.replace(/\/\/[^@]+@/, '//***@')
  }
}
