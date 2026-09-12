// src/modules/01catalog/infra/services/product-finder.service.ts

import { Inject, Injectable } from '@nestjs/common';

import { PRODUCT_REPOSITORY } from '@infra/tokens';
import { ProductRepository } from '@catalog/domain/repositories/product.repository';

import {
  ProductFinderPort,
  ProductSnapshot,
} from '@order/application/ports/product-finder.port';

@Injectable()
export class ProductFinderAdapter implements ProductFinderPort {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async findByIds(productIds: string[]): Promise<ProductSnapshot[]> {
    const products = await this.productRepository.findByIds(productIds);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price.getValue(),
      stock: p.stock,
      status: p.status,
    }));
  }
}
