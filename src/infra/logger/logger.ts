import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { createLogger, format, transports } from 'winston';
import { Logger } from './logger.interface';

const { combine, timestamp, errors, json } = format;

export interface CorrelationContext {
  correlationId: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

const SERVICE_NAME = process.env.SERVICE_NAME || 'ecommerce-api';

const rootLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: SERVICE_NAME },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [new transports.Console()],
});

@Injectable()
export class AppLogger implements Logger {
  private withContext(meta: Record<string, any> = {}) {
    const correlationId =
      correlationStorage.getStore()?.correlationId ?? 'APP-START';
    return { correlationId, ...meta };
  }

  info(message: string, meta: Record<string, any> = {}) {
    rootLogger.info(message, this.withContext(meta));
  }

  error(message: string, meta: Record<string, any> = {}) {
    rootLogger.error(message, this.withContext(meta));
  }

  warn(message: string, meta: Record<string, any> = {}) {
    rootLogger.warn(message, this.withContext(meta));
  }

  debug(message: string, meta: Record<string, any> = {}) {
    rootLogger.debug(message, this.withContext(meta));
  }
}
