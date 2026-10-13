// class Order {
//   private items: OrderItem[] = [];
//   private status: OrderStatus = OrderStatus.Draft;
//   private total: Money = Money.zero();

//   constructor(
//     private readonly id: OrderId,
//     private readonly userId: UserId,
//     private readonly idempotencyKey: string,
//   ) {}

//   addItem(productId: ProductId, quantity: number, unitPrice: Money) {
//     if (this.status !== OrderStatus.Draft) {
//       throw new Error('No se pueden agregar items a un pedido confirmado');
//     }
//     if (quantity <= 0) {
//       throw new Error('La cantidad debe ser mayor a cero');
//     }

//     const item = new OrderItem(
//       OrderItemId.generate(),
//       productId,
//       quantity,
//       unitPrice,
//     );

//     this.items.push(item);
//     this.recalculateTotal();
//   }

//   confirm() {
//     if (this.items.length === 0) {
//       throw new Error('No se puede confirmar un pedido sin items');
//     }
//     this.status = OrderStatus.Confirmed;
//     // registrar evento OrderConfirmed
//   }

//   private recalculateTotal() {
//     this.total = this.items.reduce(
//       (acc, item) => acc.add(item.subtotal()),
//       Money.zero(),
//     );
//   }
// }
