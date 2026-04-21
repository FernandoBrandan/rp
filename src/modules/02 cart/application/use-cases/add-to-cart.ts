import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { Cart } from '../../domain/cart.entity';
import { CartItem } from '../../domain/value-objects/cartItem.vo';
import { CartRepository } from '../../domain/repositories/cart.repository';

import { ProductChecker } from '../ports/product.port';
import { AddToCartDTO } from '../dto/addToCart.dto';
import { CartMapper } from '../mappers/cart.mapper';

import { CART_REPOSITORY, LOGGER, PRODUCT_CHECKER } from '@infra/tokens';

@Injectable()
export class AddToCart {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,

    @Inject(PRODUCT_CHECKER)
    private readonly productChecker: ProductChecker,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, dto: AddToCartDTO) {
    const { item } = dto;

    this.logger.info('Adding product to cart for user', {
      userId,
      productId: item.productId,
      quantity: item.quantity,
    });

    const product = await this.productChecker.validateAvailability(
      item.productId,
      item.quantity,
    );
    if (!product.isValid) {
      this.logger.warn('Product not available', {
        productId: item.productId,
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

    let cart = await this.cartRepository.getCart(userId);
    if (!cart) cart = new Cart(userId);

    cart.addItem(new CartItem(item.productId, item.quantity));

    await this.cartRepository.save(cart);

    this.logger.info('Product added to cart for user', {
      userId,
      productId: item.productId,
      quantity: item.quantity,
    });

    return CartMapper.toResponseDTO(cart);
  }
}
