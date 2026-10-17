// src/app.module.ts

import { Module } from '@nestjs/common'

import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module'
import { ConfigModule } from '@infra/config/config.module'
import { DatabaseModule } from '@infra/database/database.module'
import { HealthModule } from '@infra/health/health.module'
import { LoggerModule } from '@infra/logger/logger.module'
import { SchedulerModule } from './infra/scheduler/scheduler.module'
import { EventBusModule } from '@infra/event-bus/event-bus.module'

import { AuthModule } from '@auth/auth.module'
import { UserModule } from '@user/user.module'
import { CatalogModule } from '@catalog/catalog.module'
import { CartModule } from '@cart/cart.module'
import { OrderModule } from '@order/order.module'

@Module({
  imports: [
    AuthInfraModule,
    ConfigModule,
    DatabaseModule,
    HealthModule,
    LoggerModule,
    SchedulerModule,
    EventBusModule,
    AuthModule,
    UserModule,
    CatalogModule,
    CartModule,
    OrderModule,
  ],
})
export class AppModule {}
