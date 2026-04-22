// src/modules/02cart/application/ports/product-checker.port.ts

export interface ProductDetails {
  name: string;
  price: number;
  status: string;
  stock: number;
}

export interface ProductCheckerPort {
  validateAvailability(
    productId: string,
    quantity: number,
  ): Promise<{ isValid: boolean; reason?: string }>;
  getDetails(productId: string): Promise<ProductDetails | null>;
}
