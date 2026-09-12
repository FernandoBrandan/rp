// src/modules/01catalog/application/use-cases/update-product.use-case.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { Money } from '@catalog/domain/value-objects/money.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';
import { ProductRepository } from '@catalog/domain/repositories/product.repository';
import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';
import { UpdateProductDTO } from '../dto/request/update-product.request.dto';
import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class UpdateProductUseCase {
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

    if (dto.name !== undefined) product.updateName(dto.name);
    if (dto.price !== undefined) product.updatePrice(new Money(dto.price));
    if (dto.stock !== undefined) product.updateStock(dto.stock);
    if (dto.status !== undefined) {
      if (dto.status === ProductStatus.ACTIVE) product.activate();
      else product.deactivate();
    }

    await this.productRepository.save(product);

    this.logger.info('Product updated', {
      id: product.id,
      serial: product.serial.getValue(),
    });

    return ProductMapper.toResponse(product);
  }
}
