// src/modules/03order/presentation/order.controller.ts
import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { CreateOrderUseCase } from '../application/use-cases/create-order.use-case';
import { CreateOrderDTO } from '../application/dto/request/create-order.dto';
import { OrderResponseDTO } from '../application/dto/response/order-response.dto';
import { OrderRepository } from '../domain/repositories/order.repository';
import { ORDER_REPOSITORY } from '@infra/tokens';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUseCase: CreateOrderUseCase,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  @Post()
  async create(@Body() dto: CreateOrderDTO): Promise<OrderResponseDTO> {
    return this.createOrderUseCase.execute(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<OrderResponseDTO> {
    const order = await this.orderRepository.getOrderDetail(id);
    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return OrderResponseDTO.fromDomain(order);
  }

  @Get()
  async findByUser(
    @Param('userId') userId: string,
  ): Promise<OrderResponseDTO[]> {
    const orders = await this.orderRepository.getOrdersByUser(userId);
    return orders.map(OrderResponseDTO.fromDomain);
  }
}
