// src/modules/01catalog/application/dto/request/create-product.request.dto.ts
import { IsString, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

export class CreateProductDTO {
  @IsString()
  serial: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
