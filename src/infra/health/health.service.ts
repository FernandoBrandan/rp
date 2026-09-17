import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';
import { RedisService } from '@infra/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisService,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async checkDatabase(): Promise<{ status: 'up' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      this.logger.error('Database health check failed', {
        event: 'health_check_failed',
        component: 'database',
        error: error instanceof Error ? error.message : String(error),
      });
      throw withCause('Database is down', error);
    }
  }

  async checkRedis(): Promise<{ status: 'up' }> {
    try {
      await this.redis.get('__health__');
      return { status: 'up' };
    } catch (error) {
      this.logger.error('Redis health check failed', {
        event: 'health_check_failed',
        component: 'redis',
        error: error instanceof Error ? error.message : String(error),
      });
      throw withCause('Redis is down', error);
    }
  }
}

function withCause(message: string, cause: unknown): Error {
  const err = new Error(message);
  (err as Error & { cause?: unknown }).cause = cause;
  return err;
}
