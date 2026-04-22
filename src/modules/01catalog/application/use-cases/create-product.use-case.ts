// src/modules/01catalog/application/use-cases/create-product.use-case.ts
import { ConflictException, Inject, Injectable } from '@nestjs/common';

import { customAlphabet } from 'nanoid';

import { Logger } from '@infra/logger/logger.interface';

import { Product } from '../../domain/product.entity';
import { Serial } from '../../domain/value-objects/serial.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { ProductRepository } from '../../domain/repositories/product.repository';

import { CreateProductDTO } from '../dto/request/create-product.request.dto';

import { LOGGER, PRODUCT_REPOSITORY } from '@infra/tokens';

import { ProductMapper } from '../mappers/product.mapper';

@Injectable()
export class CreateProductUseCase {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: CreateProductDTO) {
    this.logger.info('Creating product', { serial: dto.serial });

    const numericId = customAlphabet('0123456789', 6);
    const serialSKU: Serial = new Serial(`PROD-${numericId(6)}`);

    const product = new Product(
      crypto.randomUUID(),
      serialSKU,
      dto.name,
      new Money(dto.price),
      dto.stock,
    );

    try {
      await this.productRepository.save(product);
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Serial already exists');
      }
      throw error;
    }

    this.logger.info('Product created', {
      id: product.id,
      serial: product.serial,
    });

    return ProductMapper.toResponse(product);
  }
}
