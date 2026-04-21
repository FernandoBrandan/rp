import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrder } from '../application/use-cases/create-order';
import { CreateOrderDTO } from '../application/dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private createOrder: CreateOrder) {}

  @Post()
  create(@Body() dto: CreateOrderDTO) {
    return this.createOrder.execute(dto);
  }

  // @Post('webhooks/mercado-pago')
  // async handleMP(@Body() data: any) {
  //   // 1. Validar que la notificación es real
  //   // 2. Extraer el orderId del metadato que enviaste a MP
  //   const order = await this.orderRepository.getOrderDetail(
  //     data.external_reference,
  //   );

  //   if (data.status === 'approved') {
  //     order.pay();
  //   } else {
  //     order.fail();
  //   }

  //   await this.orderRepository.update(order);
  //   // 3. Responder 200 OK a MP siempre, rápido.
  // }

  // 🌐 6. Endpoint para consultar el link
  // 📍 presentation/order.controller.ts
  // endpoint
  // @Get(':id/payment-link')
  // async getPaymentLink(@Param('id') id: string) {
  //   const order = await this.orderRepository.findById(id);

  //   if (!order) {
  //     throw new NotFoundException('Order not found');
  //   }

  //   return {
  //     orderId: order.id,
  //     status: order.status.getValue(),
  //     paymentUrl: order.paymentUrl ?? null,
  //   };
  // }
}
