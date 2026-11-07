// src/infra/logger/logger.module.ts
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLogger } from './logger';
import { LoggingInterceptor } from './logging.interceptor';
import { LOGGER } from '@infra/tokens';

@Module({
  providers: [
    {
      provide: LOGGER,
      useClass: AppLogger,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [LOGGER],
})
export class LoggerModule {}
