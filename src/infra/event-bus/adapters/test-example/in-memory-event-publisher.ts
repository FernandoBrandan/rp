// src/infra/event-bus/in-memory-event-publisher.ts
import { Inject, Injectable } from '@nestjs/common'
import { Logger } from '@infra/logger/logger.interface'
import { LOGGER } from '@infra/tokens'
import { EventPublisherPort } from '@infra/event-bus/ports/event-publisher.port'

/**
 * Publicador in-memory. No persiste ni entrega a nadie.
 * Solo loguea. Reemplaza a EventEmitter2 durante el desarrollo
 * y en tests, sin acoplar el use case a un broker real.
 *
 * El adapter NO interpreta el payload: lo serializa y lo loguea.
 */
@Injectable()
export class InMemoryEventPublisher implements EventPublisherPort {
  constructor(
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async publish<T extends object>(topic: string, payload: T): Promise<void> {
    this.logger.info('Event published (in-memory)', {
      event: 'event_published',
      topic,
      payload,
    })
  }
}
