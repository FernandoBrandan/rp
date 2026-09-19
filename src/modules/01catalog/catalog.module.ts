import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@infra/logger/logger.module';
import {
  PRODUCT_REPOSITORY,
  PRODUCT_CHECKER,
  PRODUCT_FINDER,
  STOCK_SERVICE,
} from '@infra/tokens';
import { CatalogController } from './presentation/catalog.controller';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { ProductEntity } from './infra/persistence/product.orm-entity';
import { StockReservationEntity } from './infra/persistence/stock-reservation.orm-entity';
import { TypeOrmProductRepository } from './infra/repositories/typeorm-product.repository';
import { ProductCheckerAdapter } from './infra/adapters/product-checker.adapter';
import { ProductFinderAdapter } from './infra/adapters/product-finder.adapter';
import { StockReservationAdapter } from './infra/adapters/stock-reservation.adapter';

import { AuthInfraModule } from '@infra/auth-infra/auth-infra.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, StockReservationEntity]),
    LoggerModule,
    AuthInfraModule,
  ],
  controllers: [CatalogController],
  providers: [
    CreateProductUseCase,
    UpdateProductUseCase,
    ListProductsUseCase,
    GetProductUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: TypeOrmProductRepository,
    },
    ProductCheckerAdapter,
    {
      provide: PRODUCT_CHECKER,
      useExisting: ProductCheckerAdapter,
    },
    StockReservationAdapter,
    {
      provide: STOCK_SERVICE,
      useExisting: StockReservationAdapter,
    },
    ProductFinderAdapter,
    {
      provide: PRODUCT_FINDER,
      useExisting: ProductFinderAdapter,
    },
  ],
  exports: [PRODUCT_REPOSITORY, PRODUCT_CHECKER, STOCK_SERVICE, PRODUCT_FINDER],
})
export class CatalogModule {}
