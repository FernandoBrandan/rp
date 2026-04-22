// src/modules/03order/application/dto/request/create-order.dto.ts
import {
  IsString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsUUID,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDTO {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreateOrderDTO {
  @IsString()
  @IsUUID()
  userId: string;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDTO)
  items: OrderItemDTO[];
}
