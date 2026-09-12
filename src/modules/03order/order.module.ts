import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@infra/logger/logger.module';
import { RedisModule } from '@infra/redis/redis.module';
import {
  ORDER_REPOSITORY,
  ORDER_FINDER,
  ORDER_PAYMENT_STATUS,
} from '@infra/tokens';
import { CatalogModule } from '@catalog/catalog.module';
import { OrderController } from './presentation/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { OrderEntity } from './infra/persistence/order.orm-entity';
import { TypeOrmOrderRepository } from './infra/repositories/typeorm-order.repository';
import { OrderIdGenerator } from './infra/services/order-id-generator.service';
import { OrderFinderAdapter } from './infra/adapters/order-finder.adapter';
import { OrderPaymentStatusAdapter } from './infra/adapters/order-payment-status.adapter';
import { PaymentLinkCreatedListener } from './application/listeners/payment-link-created.listener';
import { OrderPaidListener } from './application/listeners/order-paid.listener';
import { OrderPaymentFailedListener } from './application/listeners/order-payment-failed.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    LoggerModule,
    RedisModule,
    CatalogModule,
  ],
  controllers: [OrderController],
  providers: [
    CreateOrderUseCase,
    OrderIdGenerator,
    OrderFinderAdapter,
    OrderPaymentStatusAdapter,
    PaymentLinkCreatedListener,
    OrderPaidListener,
    OrderPaymentFailedListener,
    { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
    { provide: ORDER_FINDER, useClass: OrderFinderAdapter },
    {
      provide: ORDER_PAYMENT_STATUS,
      useExisting: OrderPaymentStatusAdapter,
    },
  ],
  exports: [ORDER_REPOSITORY, ORDER_FINDER, ORDER_PAYMENT_STATUS],
})
export class OrderModule {}
