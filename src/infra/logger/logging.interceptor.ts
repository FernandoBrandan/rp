// src/infra/logger/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Scope,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';

@Injectable({ scope: Scope.REQUEST })
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const now = Date.now();

    const req = context.switchToHttp().getRequest();

    const res = context.switchToHttp().getResponse();
    const { method, url: path } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - now;
          const status = res.statusCode;

          const level =
            status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

          this.logger[level]('HTTP Request', {
            method,
            path,
            status,
            durationMs,
          });
        },
        error: (err) => {
          const durationMs = Date.now() - now;
          const status = err.status || err.statusCode || 500;

          const level =
            status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

          this.logger[level]('HTTP Request', {
            method,
            path,
            status,
            durationMs,
            error: err.response?.message || err.message || 'Unexpected error',
            errorType: err.constructor?.name || 'UnknownError',
          });
        },
      }),
    );
  }
}
