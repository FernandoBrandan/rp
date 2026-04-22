// src/modules/02cart/application/use-cases/remove-from-cart.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { CartRepository } from '../../domain/repositories/cart.repository';
import { CartMapper } from '../mappers/cart.mapper';

import { CART_REPOSITORY, LOGGER } from '@infra/tokens';

@Injectable()
export class RemoveFromCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, productId: string) {
    this.logger.info('Removing product from cart', {
      userId,
      productId,
    });

    const cart = await this.cartRepository.getCart(userId);
    if (!cart) {
      this.logger.warn('Cart not found for user', { userId });
      throw new NotFoundException('Cart not found');
    }

    cart.removeItem(productId);
    await this.cartRepository.save(cart);

    this.logger.info('Product removed from cart', {
      userId,
      productId,
    });

    return CartMapper.toResponseDTO(cart);
  }
}
