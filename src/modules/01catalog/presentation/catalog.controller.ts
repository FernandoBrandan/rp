// src/modules/01catalog/presentation/catalog.controller.ts

import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateProductUseCase } from '../application/use-cases/create-product.use-case';
import { UpdateProductUseCase } from '../application/use-cases/update-product.use-case';
import { ListProductsUseCase } from '../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../application/use-cases/get-product.use-case';

import { CreateProductDTO } from '../application/dto/request/create-product.request.dto';
import { UpdateProductDTO } from '../application/dto/request/update-product.request.dto';

@Controller('products')
export class CatalogController {
  constructor(
    private createProduct: CreateProductUseCase,
    private listProducts: ListProductsUseCase,
    private getProduct: GetProductUseCase,
    private updateProduct: UpdateProductUseCase,
  ) {}

  @Post()
  create(@Body() dto: CreateProductDTO) {
    return this.createProduct.execute(dto);
  }

  @Put()
  update(@Body() dto: UpdateProductDTO) {
    return this.updateProduct.execute(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.getProduct.execute(id);
  }

  @Get()
  list() {
    return this.listProducts.execute();
  }
}
