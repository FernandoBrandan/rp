import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from '@infra/logger/logger.module';
import { CART_REPOSITORY } from '@infra/tokens';

import { CartController } from './presentation/cart.controller';

import { GetCart } from './application/use-cases/get-cart';
import { AddToCart } from './application/use-cases/add-to-cart';
import { RemoveFromCart } from './application/use-cases/remove-from-cart';
import { UpdateQuantity } from './application/use-cases/update-quantity';

import { CartOrmEntity } from './infra/persistence/cart.orm-entity';
import { TypeOrmCartRepository } from './infra/repositories/typeorm-cart.repository';

import { CatalogModule } from '@catalog/catalog.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartOrmEntity]),
    LoggerModule,
    CatalogModule,
  ],
  controllers: [CartController],
  providers: [
    GetCart,
    AddToCart,
    RemoveFromCart,
    UpdateQuantity,
    {
      provide: CART_REPOSITORY,
      useClass: TypeOrmCartRepository,
    },
  ],
})
export class CartModule {}
