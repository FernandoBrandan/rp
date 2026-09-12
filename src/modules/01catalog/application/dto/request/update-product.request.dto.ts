// src/modules/01catalog/application/dto/request/update-product.request.dto.ts
import { IsString, IsNumber, Min, IsEnum, IsOptional } from 'class-validator';
import { ProductStatus } from '@catalog/domain/value-objects/productStatus.vo';

export class UpdateProductDTO {
  @IsString()
  serial: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
