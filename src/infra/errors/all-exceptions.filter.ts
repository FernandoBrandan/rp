import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Logger } from '@infra/logger/logger.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    const logPayload = {
      path: request.url,
      method: request.method,
      message,
      status,
    };

    if (status >= 500) {
      this.logger.error('Unhandled exception', logPayload);
    }

    response.status(status).json({
      statusCode: status,
      message,
    });
  }
}
