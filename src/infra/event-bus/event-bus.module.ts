// src/infra/event-bus/event-bus.module.ts
import { Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { LoggerModule } from '@infra/logger/logger.module'
import { EVENT_CONSUMER, EVENT_PUBLISHER, EVENT_PUBLISHER_HEALTH } from '@infra/tokens'

import { EventPublisherPort } from './ports/event-publisher.port'
import { EventPublisherHealthPort } from './ports/event-publisher-health.port'

import { InMemoryEventPublisher } from './adapters/test-example/in-memory-event-publisher'
import { InMemoryEventConsumer } from './adapters/test-example/in-memory-event-consumer'
import { RabbitMQEventPublisher } from './adapters/rabbitmq-event-publisher'
import { RabbitMQEventConsumer } from './adapters/rabbitmq-event-consumer'

@Global()
@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [
    InMemoryEventPublisher,
    InMemoryEventConsumer,
    RabbitMQEventPublisher,
    RabbitMQEventConsumer,
    {
      provide: EVENT_CONSUMER,
      inject: [ConfigService, InMemoryEventConsumer, RabbitMQEventConsumer],
      useFactory: (config, inMem, rabbit) =>
        config.get('EVENT_BUS_DRIVER', 'in-memory') === 'rabbitmq' ? rabbit : inMem,
    },
    {
      provide: EVENT_PUBLISHER,
      inject: [ConfigService, InMemoryEventPublisher, RabbitMQEventPublisher],
      useFactory: (
        config: ConfigService,
        inMemory: InMemoryEventPublisher,
        rabbit: RabbitMQEventPublisher,
      ): EventPublisherPort => {
        const driver = config.get<string>('EVENT_BUS_DRIVER', 'in-memory')
        return driver === 'rabbitmq' ? rabbit : inMemory
      },
    },
    {
      provide: EVENT_PUBLISHER_HEALTH,
      inject: [ConfigService, InMemoryEventPublisher, RabbitMQEventPublisher],
      useFactory: (config, inMemory, rabbit): EventPublisherHealthPort => {
        return config.get('EVENT_BUS_DRIVER', 'in-memory') === 'rabbitmq' ? rabbit : inMemory
      },
    },
  ],
  exports: [EVENT_CONSUMER, EVENT_PUBLISHER, EVENT_PUBLISHER_HEALTH],
})
export class EventBusModule {}

//  Por qué @Global():
//  EVENT_PUBLISHER lo van a usar Order, Cart, Catalog...Todos.
//  Hacerlo global evita que cada módulo tenga que importar EventBusModule explícitamente.
//  Es un cross - cutting concern, como el logger.
