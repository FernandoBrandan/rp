// src/common/filters/infrastructure-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { InfrastructureException } from './infrastructure.exception';

@Catch(InfrastructureException)
export class InfrastructureExceptionFilter implements ExceptionFilter {
  catch(exception: InfrastructureException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: exception.message || 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
