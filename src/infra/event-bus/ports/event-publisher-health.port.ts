// src/infra/event-bus/ports/event-publisher-health.port.ts

export interface EventPublisherHealthPort {
  isHealthy(): Promise<boolean>
}
