// order/infra/services/order-id-generator.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { LOGGER, REDIS_CLIENT } from '@infra/tokens';
import { Logger } from '@infra/logger/logger.interface';
import Redis from 'ioredis';

@Injectable()
export class OrderIdGenerator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async generate(): Promise<string> {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}${mm}${dd}`; // "20250421"

      const redisKey = `order:seq:${dateKey}`;
      const seq = await this.redis.incr(redisKey); // atómico, comienza en 1

      // Opcional: fijar expiración de la key al final del día (para limpieza automática)
      const secondsUntilMidnight = this.secondsUntilMidnight(now);
      await this.redis.expire(redisKey, secondsUntilMidnight);

      const paddedSeq = String(seq).padStart(4, '0');
      return `ORDER-${dateKey}-${paddedSeq}`;
    } catch (err) {
      this.logger.error('Redis failed, fallback to timestamp+random', err);
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeKey = now.toISOString().slice(11, 19).replace(/:/g, '');
      const ms = now.getMilliseconds().toString().padStart(3, '0');
      const random = Math.random().toString(36).substring(2, 6);
      return `ORDER-${dateKey}-${timeKey}${ms}${random}`;
    }
  }

  private secondsUntilMidnight(now: Date): number {
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }
}
