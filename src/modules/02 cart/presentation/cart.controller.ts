import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Delete,
} from '@nestjs/common';

import { AddToCart } from '../application/use-cases/add-to-cart';
import { UpdateQuantity } from '../application/use-cases/update-quantity';
import { RemoveFromCart } from '../application/use-cases/remove-from-cart';
import { GetCart } from '../application/use-cases/get-cart';

import { AddToCartDTO } from '../application/dto/addToCart.dto';
import { UpdateQuantityDTO } from '../application/dto/update-quantity.dto';

@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUC: GetCart,
    private readonly addToCartUC: AddToCart,
    private readonly updateQuantityUC: UpdateQuantity,
    private readonly removeFromCartUC: RemoveFromCart,
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
