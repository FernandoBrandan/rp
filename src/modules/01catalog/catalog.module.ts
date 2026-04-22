import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@infra/logger/logger.module';
import {
  PRODUCT_REPOSITORY,
  PRODUCT_CHECKER,
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
import { ProductCheckerService } from './infra/services/product-checker.service';
import { StockValidateService } from './infra/services/stock-validate.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, StockReservationEntity]),
    LoggerModule,
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
    ProductCheckerService,
    {
      provide: PRODUCT_CHECKER,
      useExisting: ProductCheckerService,
    },
    StockValidateService,
    {
      provide: STOCK_SERVICE,
      useExisting: StockValidateService,
    },
  ],
  exports: [PRODUCT_REPOSITORY, PRODUCT_CHECKER, STOCK_SERVICE],
})
export class CatalogModule {}
