import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { ProductRepository } from '../../domain/repositories/product.repository';
import { ProductStatus } from '../../domain/value-objects/productStatus.vo';

import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';
import { ProductChecker } from '../../../02 cart/application/ports/product.port';

@Injectable()
export class ProductService implements ProductChecker {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async validateAvailability(productId: string, quantity: number) {
    const product = await this.productRepository.findById(productId);

    if (!product) return { isValid: false, reason: 'PRODUCT_NOT_FOUND' };

    if (product.status !== ProductStatus.ACTIVE)
      return { isValid: false, reason: 'PRODUCT_INACTIVE' };

    if (product.stock < quantity)
      return { isValid: false, reason: 'INSUFFICIENT_STOCK' };

    return { isValid: true };
  }

  async getDetails(productId: string): Promise<any> {
    this.logger.info('ToCart - Fetching product details', { productId });
    const product = await this.productRepository.findById(productId);
    if (!product) {
      this.logger.warn('ToCart - Product not found', { productId });
      return null;
    }
    return {
      name: product.name,
      price: product.price.getValue(),
      status: product.status.getValue(),
      stock: product.stock,
    };
  }
}
