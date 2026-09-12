import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { Logger } from '@infra/logger/logger.interface';

import { Product } from '@catalog/domain/product.entity';
import { Serial } from '@catalog/domain/value-objects/serial.vo';
import { Money } from '@catalog/domain/value-objects/money.vo';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

import { ProductRepository } from '@catalog/domain/repositories/product.repository';

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

    let serial: Serial;
    try {
      serial = new Serial(dto.serial);
    } catch {
      throw new BadRequestException(
        'Invalid serial format. Must start with PROD-',
      );
    }

    const product = new Product(
      crypto.randomUUID(),
      serial,
      dto.name,
      new Money(dto.price),
      dto.stock,
      dto.status ?? ProductStatus.ACTIVE,
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
      serial: product.serial.getValue(),
    });

    return ProductMapper.toResponse(product);
  }
}
