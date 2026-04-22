// src/infra/health/health.controller.ts
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response) {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    try {
      await this.healthService.checkDatabase();
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        message: 'La aplicación está funcionando correctamente',
        database: 'connected',
        uptime: `${Math.floor(uptime)} segundos`,
        timestamp,
      });
    } catch (error) {
      return res.status(error.getStatus()).json({
        status: 'error',
        message: error.message,
        database: 'disconnected',
        uptime: `${Math.floor(uptime)} segundos`,
        timestamp,
        details: error.response?.details || null,
      });
    }
  }
}
