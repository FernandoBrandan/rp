// src/infra/database/database.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [ 
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => { 
        const nodeEnv = config.get<string>('NODE_ENV');
        const isProduction = nodeEnv === 'prod';
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASS'),
          database: config.get<string>('DB_NAME'),

          autoLoadEntities: true,

          synchronize: !isProduction,
          
          migrations: ['dist/infra/database/migrations/*.js'],
          migrationsRun: isProduction,
          migrationsTableName: 'migrations',

          logging: config.get<string>('DB_LOGGING') === 'true',

          extra: {
            max: 20,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
          },
          
          retryAttempts: 5,
          retryDelay: 3000,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
