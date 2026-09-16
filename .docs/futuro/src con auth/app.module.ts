import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './infra/database/database.module';
import { AuthInfraModule } from './infra/auth/auth.module';

import { IdentityModule } from './modules/identity/identity.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderingModule } from './modules/ordering/order.module';

@Module({
  imports: [
    AuthInfraModule,
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    // RedisModule
    
    // módulos
    IdentityModule,
    CatalogModule,
    CartModule,
    OrderingModule,
  ],
})
export class AppModule {}
