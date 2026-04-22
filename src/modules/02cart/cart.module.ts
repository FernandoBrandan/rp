// src/modules/02cart/cart.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@infra/logger/logger.module';
import { CART_REPOSITORY } from '@infra/tokens';
import { CatalogModule } from '@catalog/catalog.module';
import { CartController } from './presentation/cart.controller';
import { GetCartUseCase } from './application/use-cases/get-cart.use-case';
import { AddToCartUseCase } from './application/use-cases/add-to-cart.use-case';
import { RemoveFromCartUseCase } from './application/use-cases/remove-from-cart.use-case';
import { UpdateQuantityUseCase } from './application/use-cases/update-quantity.use-case';
import { CartOrmEntity } from './infra/persistence/cart.orm-entity';
import { TypeOrmCartRepository } from './infra/repositories/typeorm-cart.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartOrmEntity]),
    LoggerModule,
    CatalogModule,
  ],
  controllers: [CartController],
  providers: [
    GetCartUseCase,
    AddToCartUseCase,
    RemoveFromCartUseCase,
    UpdateQuantityUseCase,
    { provide: CART_REPOSITORY, useClass: TypeOrmCartRepository },
  ],
})
export class CartModule {}
