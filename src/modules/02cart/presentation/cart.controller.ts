import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiParam,
} from '@nestjs/swagger';

import { GetCartUseCase } from '../application/use-cases/get-cart.use-case';
import { AddToCartUseCase } from '../application/use-cases/add-to-cart.use-case';
import { UpdateQuantityUseCase } from '../application/use-cases/update-quantity.use-case';
import { RemoveFromCartUseCase } from '../application/use-cases/remove-from-cart.use-case';

import { AddToCartDTO } from '../application/dto/request/add-to-cart.request.dto';
import { UpdateQuantityDTO } from '../application/dto/request/update-quantity.request.dto';
import { CartResponseDTO } from '../application/dto/response/cart.response.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUC: GetCartUseCase,
    private readonly addToCartUC: AddToCartUseCase,
    private readonly updateQuantityUC: UpdateQuantityUseCase,
    private readonly removeFromCartUC: RemoveFromCartUseCase,
  ) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Obtener el carrito de un usuario (con precios)' })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: 'user-123',
  })
  @ApiOkResponse({
    description: 'Carrito del usuario',
    type: CartResponseDTO,
  })
  get(@Param('userId') userId: string): Promise<CartResponseDTO> {
    return this.getCartUC.execute(userId);
  }

  @Post(':userId')
  @ApiOperation({ summary: 'Agregar un producto al carrito' })
  @ApiCreatedResponse({
    description: 'Producto agregado',
    type: CartResponseDTO,
  })
  @ApiBadRequestResponse({
    description: 'Producto inactivo o stock insuficiente',
  })
  @ApiNotFoundResponse({ description: 'Producto no encontrado' })
  add(
    @Param('userId') userId: string,
    @Body() dto: AddToCartDTO,
  ): Promise<CartResponseDTO> {
    return this.addToCartUC.execute(userId, dto);
  }

  @Put(':userId')
  @ApiOperation({ summary: 'Actualizar la cantidad de un ítem del carrito' })
  @ApiOkResponse({
    description: 'Cantidad actualizada',
    type: CartResponseDTO,
  })
  @ApiBadRequestResponse({
    description: 'Producto inactivo o stock insuficiente',
  })
  @ApiNotFoundResponse({ description: 'Producto o carrito no encontrado' })
  update(
    @Param('userId') userId: string,
    @Body() dto: UpdateQuantityDTO,
  ): Promise<CartResponseDTO> {
    return this.updateQuantityUC.execute(userId, dto);
  }

  @Delete(':userId/:productId')
  @ApiOperation({ summary: 'Quitar un producto del carrito' })
  @ApiOkResponse({
    description: 'Producto removido',
    type: CartResponseDTO,
  })
  @ApiNotFoundResponse({ description: 'Carrito no encontrado' })
  remove(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ): Promise<CartResponseDTO> {
    return this.removeFromCartUC.execute(userId, productId);
  }
}
