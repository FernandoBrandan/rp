// src/modules/01catalog/infra/adapters/product-checker.adapter.ts

import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';
import { ProductCheckerPort } from '@cart/application/ports/product-checker.port';

@Injectable()
export class ProductCheckerAdapter implements ProductCheckerPort {
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
      status: product.status,
      stock: product.stock,
    };
  }
}
