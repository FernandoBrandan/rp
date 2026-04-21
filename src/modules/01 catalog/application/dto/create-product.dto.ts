import { IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { ProductStatus } from '../../domain/value-objects/productStatus.vo';

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

  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
