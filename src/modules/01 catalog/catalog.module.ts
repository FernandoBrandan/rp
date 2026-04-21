import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoggerModule } from '@infra/logger/logger.module';

import {
  PRODUCT_CHECKER,
  PRODUCT_REPOSITORY,
  STOCK_SERVICE,
} from '@infra/tokens';

import { CatalogController } from './presentation/catalog.controller';

import { CreateProduct } from './application/use-cases/create-product';
import { UpdateProduct } from './application/use-cases/update-product';
import { ListProducts } from './application/use-cases/list-products';
import { GetProduct } from './application/use-cases/get-product';

import { ProductEntity } from './infra/persistence/product.orm-entity';
import { TypeOrmProductRepository } from './infra/repositories/typeorm-product.repository';

import { ProductService } from './application/service/product.service';
import { StockValidate } from './application/service/stock.service';
import { StockReservation } from './infra/persistence/stock-reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity]),
    TypeOrmModule.forFeature([StockReservation]),
    LoggerModule,
  ],
  controllers: [CatalogController],
  providers: [
    CreateProduct,
    UpdateProduct,
    ListProducts,
    GetProduct,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: TypeOrmProductRepository,
    },
    ProductService,
    {
      provide: PRODUCT_CHECKER,
      useExisting: ProductService,
    },
    StockValidate,
    {
      provide: STOCK_SERVICE,
      useExisting: StockValidate,
    },
  ],
  exports: [PRODUCT_CHECKER, STOCK_SERVICE],
})
export class CatalogModule {}
