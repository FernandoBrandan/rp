// src/app.module.ts

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module';
import { ConfigModule } from '@infra/config/config.module';
import { DatabaseModule } from '@infra/database/database.module';
import { HealthModule } from '@infra/health/health.module';
import { LoggerModule } from '@infra/logger/logger.module';

import { AuthModule } from '@auth/auth.module';
import { UserModule } from '@user/user.module';
import { CatalogModule } from '@catalog/catalog.module';
import { CartModule } from '@cart/cart.module';
import { OrderModule } from '@order/order.module';
import { PaymentModule } from '@payment/payment.module';

@Module({
  imports: [
    AuthInfraModule,
    ConfigModule,
    DatabaseModule,
    HealthModule,
    LoggerModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    UserModule,
    CatalogModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
})
export class AppModule {}
