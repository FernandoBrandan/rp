// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseModule } from '@infra/database/database.module';
import { HealthModule } from '@infra/health/health.module';
import { LoggerModule } from '@infra/logger/logger.module';

import { CatalogModule } from '@catalog/catalog.module';
import { CartModule } from '@cart/cart.module';
import { OrderModule } from '@order/order.module';
import { PaymentModule } from '@payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    EventEmitterModule.forRoot(),
    HealthModule,
    LoggerModule,
    CatalogModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}
