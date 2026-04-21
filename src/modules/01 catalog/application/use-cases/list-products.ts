import { Inject, Injectable } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { ProductRepository } from '../../domain/repositories/product.repository';
import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';

import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class ListProducts {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute() {
    this.logger.info('Listing products');

    const products = await this.productRepository.findAll();

    return products.map(ProductMapper.toResponse);
  }
}
