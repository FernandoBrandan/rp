import { IsString, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDTO {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class AddToCartDTO {
  @ValidateNested()
  @Type(() => CartItemDTO)
  item: CartItemDTO;
}
