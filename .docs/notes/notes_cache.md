## Ejemplo uso:

getProduct → cache → db → cache

- 👉 útil para:
- - listProducts
- - getProduct

## 4️⃣ Search / indexing (si escala)

- infra/search
- └── elasticsearch-product.service.ts

### Cache (pendiente)

| Qué                 | Cuándo invalidar                 |
| ------------------- | -------------------------------- |
| Productos           | Cuando cambia stock o precio     |
| Órdenes por usuario | Cuando la orden cambia de estado |

Trade-off documentado: cache acelera lectura pero introduce complejidad de invalidación.

La cache no es dominio. Es infraestructura.
Pero su uso pertenece al contexto que lo necesita.

Ejemplo:

- Cart → fuerte en cache
- Catalog → cacheable
- Ordering → casi no cacheable
- Payment → nunca cache

Entonces: Redis vive en infrastructure/cache. Pero cada módulo decide cómo usarlo. No hagas un “cache central mágico”.

Hacé: Un CacheService genérico en infra.

Cada bounded context lo usa si lo necesita.

Eso mantiene control.

---

Estrategias de cache según demanda

- Cache pasivo (TTL simple)
- Cache con invalidación explícita
- Cache solo lectura en picos
- Read replicas
- Pre-warming de cache

Ejemplo Black Friday:

- Productos cacheados 5 min
- Checkout sin cache
- Stock validado en DB
- Rate limit por usuario

Eso es System Design aplicado.

```ts
import { Repository } from 'typeorm';

import { Cart } from '../../domain/cart.entity';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartItem } from '../../domain/value-objects/cartItem.vo';

import { CartOrmEntity } from '../persistence/cart.orm-entity';
import { RedisCartCache } from '../cache/redis-cart.cache';

export class TypeOrmCartRepository implements CartRepository {
  constructor(
    private repo: Repository<CartOrmEntity>,
    private cache: RedisCartCache,
  ) {}

  async getCart(userId: string): Promise<Cart | null> {
    const cached = await this.cache.get(userId);
    if (cached) {
      return new Cart(
        cached.userId,
        cached.items.map((i) => new CartItem(i.productId, i.quantity)),
      );
    }

    const entity = await this.repo.findOne({ where: { userId } });
    if (!entity) return null;

    const cart = new Cart(
      entity.userId,
      entity.items.map((i) => new CartItem(i.productId, i.quantity)),
    );

    await this.cache.set(userId, entity);

    return cart;
  }

  async save(cart: Cart): Promise<void> {
    const entity = this.repo.create({
      userId: cart.userId,
      items: cart.items,
    });

    await this.repo.save(entity);

    // 🔄 invalidar cache
    await this.cache.del(cart.userId);
  }

  async clear(userId: string): Promise<void> {
    await this.repo.delete({ userId });
    await this.cache.del(userId);
  }
}
```

```ts
// redis-cart.cache.ts
export class RedisCartCache {
  constructor(private redisClient: any) {}

  async get(userId: string) {
    const data = await this.redisClient.get(`cart:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async set(userId: string, cart: any) {
    await this.redisClient.set(
      `cart:${userId}`,
      JSON.stringify(cart),
      'EX',
      60 * 5, // TTL 5 min
    );
  }

  async del(userId: string) {
    await this.redisClient.del(`cart:${userId}`);
  }
}
```
