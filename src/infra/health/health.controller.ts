import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Liveness — ¿el proceso está vivo?',
    description:
      'No chequea dependencias. Devuelve 200 si el proceso responde.',
  })
  @ApiOkResponse({ description: 'Proceso vivo' })
  live() {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness — ¿puede atender tráfico?',
    description: 'Chequea DB y Redis. Devuelve 503 si alguno está caído.',
  })
  @ApiOkResponse({ description: 'Todos los componentes operativos' })
  @ApiServiceUnavailableResponse({
    description: 'Al menos un componente caído',
  })
  async ready() {
    const checks: Record<
      string,
      { status: 'up' } | { status: 'down'; error: string }
    > = {};

    const results = await Promise.allSettled([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis(),
    ]);

    checks.database =
      results[0].status === 'fulfilled'
        ? results[0].value
        : { status: 'down', error: (results[0].reason as Error).message };

    checks.redis =
      results[1].status === 'fulfilled'
        ? results[1].value
        : { status: 'down', error: (results[1].reason as Error).message };

    const allUp = results.every((r) => r.status === 'fulfilled');

    if (!allUp) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: allUp ? 'ok' : 'error',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
