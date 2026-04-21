import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../tokens';
import { RedisService } from './redisService.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const client = new Redis({
          host: 'localhost',
          port: 6379,
          // Opcional: password, db, etc.
        });
        client.on('error', (err) =>
          console.error('Redis connection error:', err),
        );
        return client;
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
