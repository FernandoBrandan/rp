import { Inject, Injectable, Optional } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { Logger } from '@infra/logger/logger.interface'
import { LOGGER, PAYMENT_CIRCUIT_BREAKER_HEALTH } from '@infra/tokens'
import { RedisService } from '@infra/redis/redis.service'

export interface CircuitBreakerHealthPort {
  getState: () => 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,

    @Inject(LOGGER)
    private readonly logger: Logger,

    @Optional()
    @Inject(PAYMENT_CIRCUIT_BREAKER_HEALTH)
    private readonly paymentCircuitBreaker?: CircuitBreakerHealthPort,
  ) {}

  async checkDatabase(): Promise<{ status: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1')
      return { status: 'up' }
    } catch (error) {
      this.logger.error('Database health check failed', {
        event: 'health_check_failed',
        component: 'database',
        error: error instanceof Error ? error.message : String(error),
      })
      throw withCause('Database is down', error)
    }
  }

  async checkRedis(): Promise<{ status: 'up' }> {
    try {
      await this.redis.get('__health__')
      return { status: 'up' }
    } catch (error) {
      this.logger.error('Redis health check failed', {
        event: 'health_check_failed',
        component: 'redis',
        error: error instanceof Error ? error.message : String(error),
      })
      throw withCause('Redis is down', error)
    }
  }

  async checkPaymentCircuitBreaker(): Promise<{ status: 'up' | 'degraded'; state: string }> {
    if (!this.paymentCircuitBreaker) {
      return { status: 'up', state: 'UNKNOWN' }
    }
    const state = this.paymentCircuitBreaker.getState()
    return {
      status: state === 'OPEN' ? 'degraded' : 'up',
      state,
    }
  }
}

function withCause(message: string, cause: unknown): Error {
  const err = new Error(message)
  ;(err as Error & { cause?: unknown }).cause = cause
  return err
}
