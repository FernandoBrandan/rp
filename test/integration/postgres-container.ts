import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

import { ProductEntity } from '@catalog/infra/persistence/product.orm-entity';
import { StockReservationEntity } from '@catalog/infra/persistence/stock-reservation.orm-entity';
import { CartOrmEntity } from '@cart/infra/persistence/cart.orm-entity';
import { OrderEntity } from '@order/infra/persistence/order.orm-entity';

export class TestDatabase {
  private container: StartedPostgreSqlContainer;
  public dataSource: DataSource;

  async start(): Promise<void> {
    this.container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('test')
      .withUsername('test')
      .withPassword('test')
      .start();

    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.container.getHost(),
      port: this.container.getMappedPort(5432),
      username: 'test',
      password: 'test',
      database: 'test',
      entities: [
        ProductEntity,
        StockReservationEntity,
        CartOrmEntity,
        OrderEntity,
      ],
      synchronize: true,
      dropSchema: true,
    });

    await this.dataSource.initialize();
  }

  async clear(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;
    for (const meta of entities) {
      await this.dataSource.query(`TRUNCATE TABLE "${meta.tableName}" CASCADE`);
    }
  }

  async stop(): Promise<void> {
    await this.dataSource.destroy();
    await this.container.stop();
  }
}
