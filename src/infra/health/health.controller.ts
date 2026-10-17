import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger'
import { HealthService } from './health.service'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({
    summary: 'Liveness — ¿el proceso está vivo?',
    description: 'No chequea dependencias. Devuelve 200 si el proceso responde.',
  })
  @ApiOkResponse({ description: 'Proceso vivo' })
  live() {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness — ¿puede atender tráfico?',
    description: 'Chequea DB, Redis y estado del Circuit Breaker de pagos.',
  })
  @ApiOkResponse({ description: 'Todos los componentes operativos' })
  @ApiServiceUnavailableResponse({
    description: 'Al menos un componente crítico caído',
  })
  async ready() {
    const checks: Record<string, any> = {}
    const results = await Promise.allSettled([
      this.healthService.checkDatabase(),
      this.healthService.checkRedis(),
      this.healthService.checkPaymentCircuitBreaker(),
      this.healthService.checkEventBus(),
    ])

    checks.database =
      results[0].status === 'fulfilled'
        ? results[0].value
        : { status: 'down', error: (results[0].reason as Error).message }

    checks.redis =
      results[1].status === 'fulfilled'
        ? results[1].value
        : { status: 'down', error: (results[1].reason as Error).message }

    checks.paymentCircuitBreaker =
      results[2].status === 'fulfilled'
        ? results[2].value
        : { status: 'down', error: (results[2].reason as Error).message }

    checks.eventBus =
      results[3].status === 'fulfilled'
        ? results[3].value
        : { status: 'down', error: (results[3].reason as Error).message }

    const dbUp = checks.database.status === 'up'
    const redisUp = checks.redis.status === 'up'

    // Si DB o Redis están down, el servicio no está listo para recibir tráfico
    if (!dbUp || !redisUp) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks,
        timestamp: new Date().toISOString(),
      })
    }

    return {
      status: checks.paymentCircuitBreaker.status === 'degraded' ? 'degraded' : 'ok',
      checks,
      timestamp: new Date().toISOString(),
    }
  }
}
