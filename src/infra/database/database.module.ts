import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),

        username: config.get<string>('DB_USER', 'postgres'),
        password: config.get<string>('DB_PASS', 'postgres'),
        database: config.get<string>('DB_NAME', 'ecommerce'),

        autoLoadEntities: true, // ← carga entidades registradas con forFeature()

        synchronize: true, // ⚠️ SOLO DEV, NO USAR EN PRODUCCIÓN
        // logging: true, // 👈 clave para ver queries

        // retry si DB tarda en levantar
        retryAttempts: 5,
        retryDelay: 3000,
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
