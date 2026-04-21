export interface ProductDetails {
  name: string;
  price: number;
  status: string;
  stock: number;
}
export interface ProductChecker {
  validateAvailability(
    productId: string,
    quantity: number,
  ): Promise<{
    isValid: boolean;
    reason?: string;
  }>;

  getDetails(productId: string): Promise<ProductDetails | null>;
}
