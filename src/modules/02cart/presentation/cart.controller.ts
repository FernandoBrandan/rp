import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { GetCartUseCase } from '../application/use-cases/get-cart.use-case';
import { AddToCartUseCase } from '../application/use-cases/add-to-cart.use-case';
import { UpdateQuantityUseCase } from '../application/use-cases/update-quantity.use-case';
import { RemoveFromCartUseCase } from '../application/use-cases/remove-from-cart.use-case';

import { AddToCartDTO } from '../application/dto/request/add-to-cart.request.dto';
import { UpdateQuantityDTO } from '../application/dto/request/update-quantity.request.dto';
import { CartResponseDTO } from '../application/dto/response/cart.response.dto';

import { AuthGuard } from '@infra/auth-infra/guards/jwt-auth.guard';
import { CurrentUser } from '@infra/auth-infra/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUC: GetCartUseCase,
    private readonly addToCartUC: AddToCartUseCase,
    private readonly updateQuantityUC: UpdateQuantityUseCase,
    private readonly removeFromCartUC: RemoveFromCartUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener el carrito de un usuario (con precios)' })
  @ApiOkResponse({
    description: 'Carrito del usuario',
    type: CartResponseDTO,
  })
  get(@CurrentUser('sub') userId: string): Promise<CartResponseDTO> {
    return this.getCartUC.execute(userId);
  }

  @Post('items')
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
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToCartDTO,
  ): Promise<CartResponseDTO> {
    return this.addToCartUC.execute(userId, dto);
  }

  @Put('items/:productId')
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
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateQuantityDTO,
  ): Promise<CartResponseDTO> {
    return this.updateQuantityUC.execute(userId, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Quitar un producto del carrito' })
  @ApiOkResponse({
    description: 'Producto removido',
    type: CartResponseDTO,
  })
  @ApiNotFoundResponse({ description: 'Carrito no encontrado' })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ): Promise<CartResponseDTO> {
    return this.removeFromCartUC.execute(userId, productId);
  }
}
