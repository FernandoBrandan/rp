// src/modules/02cart/presentation/cart.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';
import { GetCartUseCase } from '../application/use-cases/get-cart.use-case';
import { AddToCartUseCase } from '../application/use-cases/add-to-cart.use-case';
import { UpdateQuantityUseCase } from '../application/use-cases/update-quantity.use-case';
import { RemoveFromCartUseCase } from '../application/use-cases/remove-from-cart.use-case';

import { AddToCartDTO } from '../application/dto/request/add-to-cart.request.dto';
import { UpdateQuantityDTO } from '../application/dto/request/update-quantity.request.dto';

@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUC: GetCartUseCase,
    private readonly addToCartUC: AddToCartUseCase,
    private readonly updateQuantityUC: UpdateQuantityUseCase,
    private readonly removeFromCartUC: RemoveFromCartUseCase,
  ) {}

  @Get(':userId')
  get(@Param('userId') userId: string) {
    return this.getCartUC.execute(userId);
  }

  @Post(':userId')
  add(@Param('userId') userId: string, @Body() dto: AddToCartDTO) {
    return this.addToCartUC.execute(userId, dto);
  }

  @Put(':userId')
  update(@Param('userId') userId: string, @Body() dto: UpdateQuantityDTO) {
    return this.updateQuantityUC.execute(userId, dto);
  }

  @Delete(':userId/:productId')
  remove(
    @Param('userId') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.removeFromCartUC.execute(userId, productId);
  }
}
