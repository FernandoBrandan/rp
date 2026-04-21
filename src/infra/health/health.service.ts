import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private dataSource: DataSource) {}

  async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database connection failed',
        database: 'disconnected',
        details: error.message,
      });
    }
  }
}
