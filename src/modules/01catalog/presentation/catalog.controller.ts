import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { CreateProductUseCase } from '../application/use-cases/create-product.use-case';
import { UpdateProductUseCase } from '../application/use-cases/update-product.use-case';
import { ListProductsUseCase } from '../application/use-cases/list-products.use-case';
import { GetProductUseCase } from '../application/use-cases/get-product.use-case';

import { CreateProductDTO } from '../application/dto/request/create-product.request.dto';
import { UpdateProductDTO } from '../application/dto/request/update-product.request.dto';
import { ProductResponseDTO } from '../application/dto/response/product.response.dto';

@ApiTags('products')
@Controller('products')
export class CatalogController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
    private readonly updateProduct: UpdateProductUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear un producto' })
  @ApiCreatedResponse({
    description: 'Producto creado',
    type: ProductResponseDTO,
  })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiConflictResponse({ description: 'Serial ya existe' })
  create(@Body() dto: CreateProductDTO): Promise<ProductResponseDTO> {
    return this.createProduct.execute(dto);
  }

  @Put()
  @ApiOperation({ summary: 'Actualizar un producto por serial' })
  @ApiOkResponse({
    description: 'Producto actualizado',
    type: ProductResponseDTO,
  })
  @ApiBadRequestResponse({ description: 'Payload inválido' })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  update(@Body() dto: UpdateProductDTO): Promise<ProductResponseDTO> {
    return this.updateProduct.execute(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por serial' })
  @ApiOkResponse({
    description: 'Producto encontrado',
    type: ProductResponseDTO,
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  get(@Param('id') id: string): Promise<ProductResponseDTO> {
    return this.getProduct.execute(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los productos' })
  @ApiOkResponse({
    description: 'Listado de productos',
    type: ProductResponseDTO,
    isArray: true,
  })
  list(): Promise<ProductResponseDTO[]> {
    return this.listProducts.execute();
  }
}
