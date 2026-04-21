import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { Cart } from '../../domain/cart.entity';
import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartMapper } from '../mappers/cart.mapper';

import { CART_REPOSITORY, LOGGER, PRODUCT_CHECKER } from '@infra/tokens';
import { ProductChecker } from '../ports/product.port';

@Injectable()
export class GetCart {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,

    @Inject(PRODUCT_CHECKER)
    private readonly productChecker: ProductChecker,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string) {
    this.logger.info('Fetching cart for user', { userId });

    const cart = await this.cartRepository.getCart(userId);
    if (!cart) {
      this.logger.info('Cart not found, returning empty cart', { userId });
      const emptyCart = new Cart(userId);
      return CartMapper.toResponseDTO(emptyCart);
    }

    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const details = await this.productChecker.getDetails(item.productId);
        const price = details?.price ?? 0;

        return {
          productId: item.productId,
          quantity: item.quantity,
          name: details?.name ?? 'Producto no disponible',
          price: price,
          subtotal: price * item.quantity,
        };
      }),
    );

    this.logger.info('Cart retrieved successfully', { userId });
    return CartMapper.toEnrichedResponseDTO(cart.userId, enrichedItems);
  }
}
