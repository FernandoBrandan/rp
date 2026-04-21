import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RedisModule } from '@infra/redis/redis.module';
import { LoggerModule } from '@infra/logger/logger.module';
import { ORDER_REPOSITORY, PAYMENT_ORDER_PORT } from '@infra/tokens';

import { OrderController } from './presentation/order.controller';

import { CreateOrder } from './application/use-cases/create-order';

import { OrderEntity } from './infra/persistence/order.orm-entity';
import { TypeOrmOrderRepository } from './infra/repositories/typeorm-order.repository';

import { OrderIdGenerator } from './application/services/order-id-generator.service';
import { OrderPaymentProvider } from './application/services/OrderPaymentProvider';
import { PaymentLinkCreatedSubscriber } from './application/subscribers/payment-link-created.subscriber';
import { OrderPaidSubscriber } from './application/subscribers/order-paid.subscriber';
import { OrderPaymentFailedSubscriber } from './application/subscribers/order-fail.subscriber';

import { CatalogModule } from '@catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    LoggerModule,
    RedisModule,
    CatalogModule,
  ],
  controllers: [OrderController],
  providers: [
    CreateOrder,
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeOrmOrderRepository,
    },
    {
      provide: PAYMENT_ORDER_PORT,
      useClass: OrderPaymentProvider,
    },
    PaymentLinkCreatedSubscriber,
    OrderPaymentFailedSubscriber,
    OrderPaidSubscriber,
    OrderIdGenerator,
  ],
  exports: [ORDER_REPOSITORY, PAYMENT_ORDER_PORT],
})
export class OrderModule {}

// curl -X POST http://localhost:3000/orders \
//   -H "Content-Type: application/json" \
//   -d '{
//     "userId": "550e8400-e29b-41d4-a716-446655440000",
//     "idempotencyKey": "or1der3-2-uniqsue",
//     "items": [
//       {
//         "productId": "prod-001",
//         "quantity": 2,
//         "price": 100.5
//       },
//       {
//         "productId": "prod-002",
//         "quantity": 1,
//         "price": 50
//       }
//     ]
//   }'

// ⚙️ 6. Activar EventEmitter global
// 📍 en tu app.module.ts
// import { EventEmitterModule } from '@nestjs/event-emitter';
// @Module({
//   imports: [
//     EventEmitterModule.forRoot(),
//   ],
// })
// export class AppModule {}
