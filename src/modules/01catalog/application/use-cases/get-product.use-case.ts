// src/modules/01catalog/application/use-cases/get-product.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';
import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class GetProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(serial: string) {
    this.logger.info('Getting product', { serial: serial });
    const product = await this.productRepository.findBySerial(serial);
    if (!product) {
      this.logger.warn('Product not found', { serial: serial });
      throw new NotFoundException('Product not found');
    }

    return ProductMapper.toResponse(product);
  }
}
