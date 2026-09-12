import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { createLogger, format, transports } from 'winston';
import { Logger } from './logger.interface';

const { combine, timestamp, printf, errors } = format;

export interface CorrelationContext {
  correlationId: string;
}

export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

const logFormat = printf(
  ({ level, message, timestamp, stack, correlationId, ...meta }) => {
    const cid = correlationId || 'NO-CID';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `[${timestamp}] [${cid}] ${level.toUpperCase()}: ${stack}`
      : `[${timestamp}] [${cid}] ${level.toUpperCase()}: ${message}${metaStr}`;
  },
);

const rootLogger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [new transports.Console()],
});

@Injectable()
export class AppLogger implements Logger {
  private withContext(meta: Record<string, any> = {}) {
    const correlationId =
      correlationStorage.getStore()?.correlationId ?? 'APP-START';
    return { ...meta, correlationId };
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
