// src/modules/01catalog/application/dto/response/product.response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@catalog/domain/enums/productStatus.enum';

export class ProductResponseDTO {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  id: string;

  @ApiProperty({ example: 'PROD-123456' })
  serial: string;

  @ApiProperty({ example: 'Laptop Gamer' })
  name: string;

  @ApiProperty({ example: 1500.99 })
  price: number;

  @ApiProperty({ example: 10 })
  stock: number;

  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  status: string;
}
