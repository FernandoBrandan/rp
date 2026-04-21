import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { CreateProduct } from '../application/use-cases/create-product';
import { UpdateProduct } from '../application/use-cases/update-product';
import { ListProducts } from '../application/use-cases/list-products';
import { GetProduct } from '../application/use-cases/get-product';

import { CreateProductDTO } from '../application/dto/create-product.dto';
import { UpdateProductDTO } from '../application/dto/update-product.dto';

@Controller('products')
export class CatalogController {
  constructor(
    private createProduct: CreateProduct,
    private listProducts: ListProducts,
    private getProduct: GetProduct,
    private updateProduct: UpdateProduct,
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
