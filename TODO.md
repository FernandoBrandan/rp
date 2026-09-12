## Swagger completo

@ApiOperation({ summary }) en cada endpoint

```
// src/modules/02cart/presentation/cart.controller.ts
 @Get(':userId')
  @ApiOperation({ summary: 'Obtener el carrito de un usuario (con precios)' })
  @ApiParam({
    name: 'userId',
    description: 'ID del usuario',
    example: 'user-123',
  })
  @ApiOkResponse({
    description: 'Carrito del usuario',
    type: CartResponseDTO,
  })
  get(@Param('userId') userId: string): Promise<CartResponseDTO> {
    return this.getCartUC.execute(userId);
  }
```

## Pendiente (segunda pasada, si querés)

- Los DTOs de request están sin decorar:
  - CreateProductDTO, UpdateProductDTO
  - AddToCartDTO, CartItemDTO, UpdateQuantityDTO
  - CreateOrderDTO, OrderItemDTO

Cada uno necesita @ApiProperty en cada campo para que la UI muestre ejemplos y validaciones.
Es una pasada rápida, pero mecánica (~40 decoradores).
