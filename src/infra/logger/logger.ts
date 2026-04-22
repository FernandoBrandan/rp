// src/infra/logger/logger.ts
import { REQUEST } from '@nestjs/core';
import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { Request } from 'express';
import { Logger } from './logger.interface';
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, errors } = format;

const logFormat = printf(
  ({ level, message, timestamp, stack, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `[${timestamp}] [${correlationId || 'NO-CID'}] ${level.toUpperCase()}: ${stack}`
      : `[${timestamp}] [${correlationId || 'NO-CID'}] ${level.toUpperCase()}: ${message}${metaStr}`;
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

@Injectable({ scope: Scope.REQUEST })
export class AppLogger implements Logger {
  private logger: ReturnType<typeof rootLogger.child>;

  constructor(@Optional() @Inject(REQUEST) private readonly req?: Request) {
    const correlationId = (req as any)?.correlationId || 'APP-START';
    this.logger = rootLogger.child({ correlationId });
  }

  info(message: string, meta: Record<string, any> = {}) {
    this.logger.info(message, meta);
  }

  error(message: string, meta: Record<string, any> = {}) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta: Record<string, any> = {}) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta: Record<string, any> = {}) {
    this.logger.debug(message, meta);
  }
}
