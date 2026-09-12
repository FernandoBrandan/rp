import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';

import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { CreateOrderDTO } from '../application/dto/request/create-order.dto';
import { OrderResponseDTO } from '../application/dto/response/order-response.dto';
import { OrderRepository } from '../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@infra/tokens';
import { OrderMapper } from '../application/mappers/order.mapper';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear una orden',
    description:
      'Idempotente por `idempotencyKey`. Si la orden ya existe y el link de pago todavía se está generando, devuelve 202.',
  })
  @ApiCreatedResponse({
    description: 'Orden creada',
    type: OrderResponseDTO,
  })
  @ApiAcceptedResponse({
    description: 'Orden existente, link de pago en generación',
  })
  @ApiBadRequestResponse({
    description: 'Producto no encontrado, inactivo o stock insuficiente',
  })
  @ApiConflictResponse({ description: 'Idempotency key duplicada en carrera' })
  async create(@Body() dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    return this.createOrderUseCase.execute(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una orden por ID' })
  @ApiOkResponse({
    description: 'Orden encontrada',
    type: OrderResponseDTO,
  })
  @ApiNotFoundResponse({ description: 'Orden no encontrada' })
  async findOne(@Param('id') id: string): Promise<OrderResponseDTO> {
    const order = await this.orderRepository.getOrderDetail(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return OrderMapper.toResponse(order);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Listar órdenes de un usuario' })
  @ApiOkResponse({
    description: 'Listado de órdenes',
    type: OrderResponseDTO,
    isArray: true,
  })
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<OrderResponseDTO[]> {
    const orders = await this.orderRepository.getOrdersByUser(userId);
    return orders.map(OrderMapper.toResponse);
  }
}
