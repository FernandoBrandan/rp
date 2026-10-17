// src/modules/03order/application/use-cases/create-order.use-case.ts
import { Injectable, Inject, HttpException, BadRequestException } from '@nestjs/common'
import { Logger } from '@infra/logger/logger.interface'

import { Order } from '@main/modules/03order/domain/order.entity'
import { OrderItem } from '@order/domain/value-objects/orderItem.vo'
import { Money } from '@main/common/domain/value-objects/money.vo'

import { OrderRepository } from '@order/domain/repositories/order.repository'

import { CreateOrderDTO } from '../dto/request/create-order.dto'
import { OrderResponseDTO } from '../dto/response/order-response.dto'

import { OrderIdGenerator } from '@order/infra/services/order-id-generator.service'
import { StockPort } from '../ports/stock.port'
import { ProductFinderPort } from '../ports/product-finder.port'
import { EventPublisherPort } from '@infra/event-bus/ports/event-publisher.port'

import {
  EVENT_PUBLISHER,
  LOGGER,
  ORDER_REPOSITORY,
  PRODUCT_FINDER,
  STOCK_SERVICE,
} from '@infra/tokens'

import { Topics } from '@common/events/event-names'
import { OrderCreatedEvent } from '@common/events/'
import { OrderMapper } from '../mappers/order.mapper'
import { InsufficientStockException } from '@common/exceptions/insufficient-stock.exception'
import { OrderStatus } from '../../domain/enums/orderStatus.enum'
import { Currency } from '@main/common/domain/value-objects/currency.vo'

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: EventPublisherPort,

    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,

    @Inject(STOCK_SERVICE)
    private readonly stockService: StockPort,

    @Inject(PRODUCT_FINDER)
    private readonly productFinderService: ProductFinderPort,

    private readonly orderIdGenerator: OrderIdGenerator,

    @Inject(LOGGER)
    private readonly logger: Logger,
  ) {}

  async execute(userId: string, dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    this.logger.info('Create Order', {
      idempotencyKey: dto.idempotencyKey,
      userId: userId,
    })

    // Idempotencia
    const existingOrder = await this.orderRepository.findByIdempotencyKey(dto.idempotencyKey)

    if (existingOrder) {
      const terminalStatuses = [
        OrderStatus.PAID,
        OrderStatus.COMPLETED,
        OrderStatus.FAILED,
        OrderStatus.CANCELLED,
      ]
      if (terminalStatuses.includes(existingOrder.status))
        return OrderMapper.toResponse(existingOrder)
      if (!existingOrder.paymentUrl)
        throw new HttpException('Payment link being generated, please retry', 202)
      return OrderMapper.toResponse(existingOrder)
    }

    const orderId = await this.orderIdGenerator.generate()

    // precio autoritativo
    const productIds = dto.items.map((i) => i.productId)
    const products = await this.productFinderService.findByIds(productIds)
    const productMap = new Map(products.map((p) => [p.id, p]))

    // Currency única para toda la orden.
    const currencyCode = products[0].currency
    const currency = Currency.from(currencyCode)

    // convertir el input cliente en VOs del dominio validados.
    // reemplazar el precio del cliente por el precio real del catálogo.
    const items = dto.items.map((i) => {
      const product = productMap.get(i.productId)
      if (!product) throw new HttpException(`Product ${i.productId} not found`, 400)

      if (product.status !== 'ACTIVE')
        throw new BadRequestException(`Product ${i.productId} is not active`)

      if (product.currency !== currencyCode) {
        throw new BadRequestException(
          `Cannot mix currencies in one order (${currencyCode} vs ${product.currency})`,
        )
      }
      return new OrderItem(i.productId, i.quantity, Money.of(product.price, currency))
    })

    let reservationId: string
    try {
      reservationId = await this.stockService.reserveStock(
        items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        orderId,
      )
    } catch (error) {
      if (error instanceof InsufficientStockException) {
        throw new BadRequestException(error.message)
      }
      throw error
    }

    const order = Order.create({
      id: orderId,
      userId: userId,
      idempotencyKey: dto.idempotencyKey,
      items,
      currency,
      reservationId,
    })

    try {
      await this.orderRepository.createOrder(order)
    } catch (error) {
      await this.stockService.releaseReservation(reservationId)

      if (error?.code === '23505') {
        // Otra request ganó la carrera. Recuperar la orden existente.
        const existing = await this.orderRepository.findByIdempotencyKey(dto.idempotencyKey)
        if (existing) {
          if (!existing.paymentUrl) {
            throw new HttpException('Payment link being generated, please retry', 202)
          }
          return OrderMapper.toResponse(existing)
        }
      }

      this.logger.error('Error creating order', {
        orderId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new HttpException('Error creating order', 500)
    }

    const event: OrderCreatedEvent = {
      orderId: order.id,
      userId: order.userId,
      total: order.total.toNumber(),
      currency: order.currency.toString(),
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        price: i.price.toNumber(),
      })),
      occurredAt: new Date().toISOString(),
    }

    try {
      await this.eventPublisher.publish(Topics.ORDER_CREATED, event)
    } catch (err) {
      // La orden YA está creada y el stock reservado.
      // No la revertimos acá: la reconciliación (cron) va a detectar
      // órdenes en PENDING sin payment link y las va a reparar.
      this.logger.error('Failed to publish order.created', {
        event: 'order_created_publish_failed',
        orderId: order.id,
        error: err instanceof Error ? err.message : String(err),
      })
      // No re-throw: el request fue exitoso, solo falló la notificación.
      // Si esto se vuelve frecuente → implementar Outbox Pattern (Fase 3).
    }

    this.logger.info('Order Created', {
      orderId: order.id,
      idempotencyKey: dto.idempotencyKey,
      userId: userId,
    })

    return OrderMapper.toResponse(order)
  }
}

// Paso D — Probar el flujo end-to-end (30 min)
// Con Postgres y Redis corriendo:
//     POST /products → crear producto ACTIVE con stock 10.
//     POST /orders con idempotencyKey: "test-1" → debe crear orden.
//     GET /orders/:id → debe aparecer con paymentUrl después de ~3s (fake provider).
//     Esperar 3s más → GET /orders/:id → debe estar PAID.
//     GET /products/:serial → stock debe haber bajado de 10 a 9 (una sola vez).
//     POST /orders con el mismo idempotencyKey: "test-1" → debe devolver la misma orden.
//     POST /orders con idempotencyKey: "test-2" e items del mismo producto → crear segunda orden.
//     POST /orders con 100 unidades → 400 Insufficient stock.
// Prueba de concurrencia (la importante del paso C):
//     Disparar dos POST /orders simultáneos con el mismo idempotencyKey.
//      Solo una debe crear la orden, la otra debe devolver la existente. Una sola reserva de stock.

// Paso E — Probar compensación con fallo simulado (15 min)
// Para verificar el catch del Paso 2:
//     Apagar Postgres después de reservar stock.
//     Disparar POST /orders.
//     Debe devolver 500.
//     Volver a levantar Postgres.
//     GET /products/:serial → stock debe estar intacto.
//     Consultar stock_reservations → debe estar RELEASED.
