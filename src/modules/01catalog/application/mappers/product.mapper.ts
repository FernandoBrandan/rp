// product.mapper.ts
import { Product } from '@catalog/domain/product.entity';
import { ProductResponseDTO } from '../dto/response/product.response.dto';

export class ProductMapper {
  static toResponse(product: Product): ProductResponseDTO {
    return {
      id: product.id,
      serial: product.serial.getValue(),
      name: product.name,
      price: product.price.getValue(),
      stock: product.stock,
      status: product.status,
    };
  }
}
