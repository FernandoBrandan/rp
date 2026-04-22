// src/modules/02cart/application/dto/request/update-quantity.request.dto.ts

import { IsString, IsNumber, Min } from 'class-validator';

export class UpdateQuantityDTO {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
