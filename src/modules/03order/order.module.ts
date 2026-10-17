import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from '@infra/logger/logger.module'
import { RedisModule } from '@infra/redis/redis.module'
import { ORDER_REPOSITORY, REFUND_SERVICE } from '@infra/tokens'
import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module'

import { CatalogModule } from '@catalog/catalog.module'
import { OrderController } from './presentation/order.controller'

import { OrderEntity } from './infra/persistence/order.orm-entity'
import { OrderIdGenerator } from './infra/services/order-id-generator.service'
import { LogRefundAdapter } from './infra/adapters/log-refund.adapter'
import { TypeOrmOrderRepository } from './infra/repositories/typeorm-order.repository'

import { CreateOrderUseCase } from './application/use-cases/create-order.use-case'
import { CancelOrderUseCase } from './application/use-cases/cancel-order.use-case'
import { OrderPaidListener } from './application/listeners/order-paid.listener'
import { PaymentLinkCreatedListener } from './application/listeners/payment-link-created.listener'
import { OrderPaymentFailedListener } from './application/listeners/order-payment-failed.listener'
import { OrderReconciliationService } from './application/services/order-reconciliation.service'

import { EventBusModule } from '@infra/event-bus/event-bus.module'
import { OrderPaidConsumer } from './application/consumers/order-paid.consumer'
import { OrderPaymentFailedConsumer } from './application/consumers/order-payment-failed.consumer'
import { PaymentLinkCreatedConsumer } from './application/consumers/payment-link-created.consumer'

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    LoggerModule,
    RedisModule,
    EventBusModule,
    AuthInfraModule,
    CatalogModule,
  ],
  controllers: [OrderController],
  providers: [
    CreateOrderUseCase,
    CancelOrderUseCase,
    OrderIdGenerator,
    PaymentLinkCreatedListener,
    OrderPaidListener,
    OrderPaymentFailedListener,
    OrderReconciliationService,
    LogRefundAdapter,
    OrderPaidConsumer,
    OrderPaymentFailedConsumer,
    PaymentLinkCreatedConsumer,
    {
      provide: ORDER_REPOSITORY,
      useClass: TypeOrmOrderRepository,
    },
    {
      provide: REFUND_SERVICE,
      useExisting: LogRefundAdapter,
    },
  ],
  exports: [ORDER_REPOSITORY, REFUND_SERVICE],
})
export class OrderModule {}
