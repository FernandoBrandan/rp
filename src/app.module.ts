import { Module } from '@nestjs/common';
// Config
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@infra/database/database.module';
// Modules
import { EventEmitterModule } from '@nestjs/event-emitter';
// Infra
import { HealthModule } from '@infra/health/health.module';
import { LoggerModule } from '@infra/logger/logger.module';
// Modules
import { CatalogModule } from '@catalog/catalog.module';
import { CartModule } from '@cart/cart.module';
import { OrderModule } from '@order/order.module';
import { PaymentModule } from '@payment/payment.module';

@Module({
  imports: [
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }), // preguntas si es necesario is global, con o sin anda igual, ver infra database

    HealthModule,
    LoggerModule,
    EventEmitterModule.forRoot(),

    CatalogModule,
    CartModule,
    OrderModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
