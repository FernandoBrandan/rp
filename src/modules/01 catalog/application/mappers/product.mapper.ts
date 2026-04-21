// product.mapper.ts
import { Product } from '../../domain/product.entity';
import { ProductResponseDTO } from '../dto/dto.response/productResponse.dto';

export class ProductMapper {
  static toResponse(product: Product): ProductResponseDTO {
    return {
      id: product.id,
      serial: product.serial.getValue(),
      name: product.name,
      price: product.price.getValue(),
      stock: product.stock,
      status: product.status.getValue(),
    };
  }
}
