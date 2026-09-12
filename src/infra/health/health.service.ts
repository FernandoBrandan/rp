// src/infra/health/health.service.ts
import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';

@Injectable()
export class HealthService {
  constructor(
    private dataSource: DataSource,

    @Inject(LOGGER)
    private logger: Logger,
  ) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      this.logger.error('Database connection failed', error);
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database connection failed',
        database: 'disconnected',
        details: error.message,
      });
    }
  }
}
