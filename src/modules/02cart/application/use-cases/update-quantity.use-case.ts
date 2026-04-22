// src/modules/02cart/application/use-cases/update-quantity.use-case.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { CartRepository } from '../../domain/repositories/cart.repository';
import { ProductCheckerPort } from '../ports/product-checker.port';
import { UpdateQuantityDTO } from '../dto/request/update-quantity.request.dto';
import { CartMapper } from '../mappers/cart.mapper';

import { CART_REPOSITORY, LOGGER, PRODUCT_CHECKER } from '@infra/tokens';

@Injectable()
export class UpdateQuantityUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,

    @Inject(PRODUCT_CHECKER)
    private readonly productChecker: ProductCheckerPort,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, dto: UpdateQuantityDTO) {
    const { productId, quantity } = dto;

    this.logger.info('Updating product quantity in cart', {
      userId,
      productId,
      quantity,
    });

    const product = await this.productChecker.validateAvailability(
      productId,
      quantity,
    );
    if (!product.isValid) {
      this.logger.warn('Product not available', {
        productId: productId,
        reason: product.reason,
      });

      if (product.reason === 'PRODUCT_NOT_FOUND')
        throw new NotFoundException('Product not found');
      if (product.reason === 'PRODUCT_INACTIVE')
        throw new BadRequestException('Product is inactive');
      if (product.reason === 'INSUFFICIENT_STOCK')
        throw new BadRequestException('Insufficient stock for product');
      throw new BadRequestException(`Product unavailable: ${product.reason}`);
    }

    const cart = await this.cartRepository.getCart(userId);
    if (!cart) {
      this.logger.warn('Cart not found for user', { userId });
      throw new NotFoundException('Cart not found');
    }

    cart.updateQuantity(productId, quantity);
    await this.cartRepository.save(cart);

    this.logger.info('Product quantity updated in cart', {
      userId,
      productId,
      quantity,
    });

    return CartMapper.toResponseDTO(cart);
  }
}
