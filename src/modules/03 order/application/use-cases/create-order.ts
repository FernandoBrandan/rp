import { Injectable, Inject, HttpException } from '@nestjs/common';
import { Logger } from '@infra/logger/logger.interface';

import { Order } from '../../domain/order.entity';
import { OrderItem } from '../../domain/value-objects/orderItem.vo';
import { Money } from '../../domain/value-objects/money.vo';

import { OrderRepository } from '../../domain/repositories/order.repository';

import { CreateOrderDTO } from '../dto/create-order.dto';
import { OrderResponseDTO } from '../dto/dto.response/orderResponse.dto';

import { OrderIdGenerator } from '../services/order-id-generator.service';
import { StockService } from '../ports/stock.port';
import { LOGGER, ORDER_REPOSITORY, STOCK_SERVICE } from '@infra/tokens';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';

@Injectable()
export class CreateOrder {
  constructor(
    private readonly eventEmitter: EventEmitter2,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockService,

    private readonly orderIdGenerator: OrderIdGenerator,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    this.logger.info('FLOW 00: Create Order', {
      idempotencyKey: dto.idempotencyKey,
      userId: dto.userId,
    });

    const existingOrder = await this.orderRepository.findByIdempotencyKey(
      dto.idempotencyKey,
    );

    if (existingOrder) {
      if (!existingOrder.paymentUrl) {
        this.eventEmitter.emit(
          'order.created',
          new OrderCreatedEvent(existingOrder.id),
        );

        throw new HttpException(
          'Payment link being generated, please retry',
          202,
        );
      }
      return OrderResponseDTO.fromDomain(existingOrder);
    }

    const orderId = await this.orderIdGenerator.generate();

    const items = dto.items.map(
      (i) => new OrderItem(i.productId, i.quantity, new Money(i.price)),
    );

    // Implementado -> ver si testea bien ja!
    // No es escalable (- loop + queries | múltiples productos → múltiples updates)
    // Evolución futura - Cuando escales:
    // - bulk update
    // - o tabla de reservas
    // - o sistema async

    const reservationId = await this.stockService.reserveStock(
      items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      orderId,
    );

    this.logger.info('Quitar log : Stock Reserved', {
      idempotencyKey: dto.idempotencyKey,
      userId: dto.userId,
      stockReservationId: reservationId,
    });

    const order = Order.create({
      id: orderId,
      userId: dto.userId,
      idempotencyKey: dto.idempotencyKey,
      items,
      reservationId,
    });
    await this.orderRepository.createOrder(order);

    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order.id));
    this.logger.info('FLOW 1 Estado Pendiente: EMITTING order.created', {
      orderId: order.id,
    });

    // 💥 Problemas de OrderCreated → Event → PaymentService
    // - debugging difícil
    // - más moving parts
    // - no sabés si el problema es order o payment
    // - sobreingeniería para tu estado actual
    // soluciones ??????

    this.logger.info('Order Created', {
      idempotencyKey: dto.idempotencyKey,
      userId: dto.userId,
    });
    return OrderResponseDTO.fromDomain(order);

    // Ni idea... ver que onda esto
    // 6. El link de pago no se regenera en retry de idempotencia
    // if (existingOrder) return OrderResponseDTO.fromDomain(existingOrder);
    // // Si la primera llamada creó la orden pero falló al generar el link, el cliente recibe una orden sin paymentUrl.
    // Consecuencia: El cliente nunca ve la URL para pagar, y no hay forma de reintentar.
  }
}

// NO importa por ahora
// A. Suscriptor de Inventario(InventorySubscriber)
// Escucha: OrderPaid
// Acción: Confirmar Stock. Mueve el stock de "Reservado" a "Vendido"(salida definitiva).
// Escucha: OrderPaymentFailed o OrderCancelled
// Acción: Liberar Stock. Mueve de "Reservado" a "Disponible".

// B. Suscriptor de Carrito(CartSubscriber)
// Escucha: OrderPaid
// Acción: Vaciar el carrito del usuario.
// ¿Por qué eventual? Porque si el carrito falla en borrarse, no queremos que el pago rebote.
// El usuario simplemente verá su carrito lleno un segundo más.

// C. Suscriptor de Notificaciones(NotificationSubscriber)
// Escucha: OrderCreated -> Envía "Tu orden está pendiente de pago".
//   Escucha: OrderPaid -> Envía "¡Gracias por tu compra! Factura adjunta".

// ---

// 4. Implementación del Flujo de Pago con URL
// Para mantener el desacoplamiento, el flujo técnico sería este:

// 1 - POST /orders:
// El Caso de Uso reserva stock (síncrono).
// Crea la Order en DB.
// Llama al PaymentProvider para generar la paymentUrl.
// Retorna: { orderId, paymentUrl }.

// 2 - Redirect: El frontend manda al usuario a esa URL.

// 3 - Webhook: El proveedor (MP/Stripe) llama a tu API.
// Tu controlador de Webhook dispara el OrderPaidEvent.
// Los suscriptores reaccionan (limpian carrito, confirman stock).
