import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { Money } from '../../domain/value-objects/money.vo';
import { ProductRepository } from '../../domain/repositories/product.repository';
import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';
import { UpdateProductDTO } from '../dto/update-product.dto';

import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class UpdateProduct {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: UpdateProductDTO) {
    this.logger.info('Updating product', { serial: dto.serial });

    const product = await this.productRepository.findBySerial(dto.serial);
    if (!product) {
      this.logger.warn('Product not found', { serial: dto.serial });
      throw new NotFoundException('Product not found');
    }

    product.name = dto.name ?? product.name;
    product.price =
      dto.price !== undefined ? new Money(dto.price) : product.price;
    product.stock = dto.stock ?? product.stock;
    product.status = dto.status ?? product.status;

    await this.productRepository.save(product);

    this.logger.info('Product updated', {
      id: product.id,
      serial: product.serial,
    });

    return ProductMapper.toResponse(product);
  }
}
