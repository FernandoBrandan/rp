// src/modules/02cart/application/dto/request/update-quantity.request.dto.ts

import { IsNumber, Min } from 'class-validator';

export class UpdateQuantityDTO {
  @IsNumber()
  @Min(1)
  quantity: number;
}
