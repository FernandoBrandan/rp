// src/infra/event-bus/adapters/in-memory-event-consumer.ts

import { Injectable } from '@nestjs/common'
import {
  EventConsumerPort,
  MessageHandler,
  SubscribeOptions,
} from '../../ports/event-consumer.port'

@Injectable()
export class InMemoryEventConsumer implements EventConsumerPort {
  stop(): Promise<void> {
    throw new Error('El método no está implementado.')
  }
  isHealthy(): Promise<boolean> {
    throw new Error('El método no está implementado.')
  }
  private readonly handlers = new Map<string, MessageHandler<any>>()

  async subscribe<T extends object>(
    topic: string,
    _options: SubscribeOptions,
    handler: MessageHandler<T>,
  ): Promise<void> {
    this.handlers.set(topic, handler as MessageHandler<any>)
  }

  /** Solo para tests: dispara el handler registrado para ese topic. */
  async dispatch<T extends object>(topic: string, payload: T): Promise<void> {
    const handler = this.handlers.get(topic)
    if (!handler) throw new Error(`No handler registered for topic ${topic}`)
    await handler(payload)
  }
}
