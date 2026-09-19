import { BadRequestException, HttpException } from '@nestjs/common';
import { InsufficientStockException } from '@common/exceptions/insufficient-stock.exception';

import { CreateOrderUseCase } from '@order/application/use-cases/create-order.use-case';
import { Order } from '@order/domain/order.entity';
import { OrderItem } from '@order/domain/value-objects/orderItem.vo';
import { Money } from '@common/domain/value-objects/money.vo';
import { OrderStatus } from '@order/domain/enums/orderStatus.enum';
import { EventNames } from '@common/events/event-names';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeOrder(id = 'ORDER-1', paymentUrl?: string): Order {
  const order = Order.create({
    id,
    userId: 'user-1',
    idempotencyKey: 'key-1',
    items: [new OrderItem('prod-1', 2, new Money(100))],
    reservationId: 'res-1',
  });
  if (paymentUrl) order.paymentUrl = paymentUrl;
  return order;
}

function makeDeps(overrides: any = {}) {
  return {
    eventEmitter: { emit: jest.fn(), emitAsync: jest.fn() },
    orderRepository: {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      createOrder: jest.fn().mockResolvedValue(undefined),
      ...overrides.orderRepository,
    },
    stockService: {
      reserveStock: jest.fn().mockResolvedValue('res-1'),
      releaseReservation: jest.fn().mockResolvedValue(undefined),
      confirmReservation: jest.fn(),
      ...overrides.stockService,
    },
    productFinder: {
      findByIds: jest.fn().mockResolvedValue([
        {
          id: 'prod-1',
          name: 'Laptop',
          price: 100,
          stock: 10,
          status: 'ACTIVE',
        },
      ]),
      ...overrides.productFinder,
    },
    orderIdGenerator: {
      generate: jest.fn().mockResolvedValue('ORDER-1'),
      ...overrides.orderIdGenerator,
    },
    logger: makeLogger(),
  };
}

function makeUseCase(deps: any) {
  return new CreateOrderUseCase(
    deps.eventEmitter,
    deps.orderRepository,
    deps.stockService,
    deps.productFinder,
    deps.orderIdGenerator,
    deps.logger,
  );
}

const USER_ID = 'user-1';

const validDto = {
  idempotencyKey: 'key-1',
  items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
};

describe('CreateOrderUseCase', () => {
  // ─── Idempotencia ──────────────────────────────────────────────
  it('devuelve la orden existente si la idempotencyKey ya existe y tiene paymentUrl', async () => {
    const existing = makeOrder('ORDER-EXISTING', 'http://pay/1');
    const deps = makeDeps({
      orderRepository: {
        findByIdempotencyKey: jest.fn().mockResolvedValue(existing),
      },
    });
    const useCase = makeUseCase(deps);

    const result = await useCase.execute(USER_ID, validDto);

    expect(result.id).toBe('ORDER-EXISTING');
    expect(deps.stockService.reserveStock).not.toHaveBeenCalled();
    expect(deps.orderRepository.createOrder).not.toHaveBeenCalled();
  });

  it('lanza 202 si la orden existe pero sin paymentUrl', async () => {
    const existing = makeOrder('ORDER-EXISTING');
    const deps = makeDeps({
      orderRepository: {
        findByIdempotencyKey: jest.fn().mockResolvedValue(existing),
      },
    });
    const useCase = makeUseCase(deps);

    await expect(useCase.execute(USER_ID, validDto)).rejects.toThrow(
      HttpException,
    );
  });

  // ─── Happy path ────────────────────────────────────────────────
  it('crea la orden, reserva stock y emite order.created', async () => {
    const deps = makeDeps();
    const useCase = makeUseCase(deps);

    const result = await useCase.execute(USER_ID, validDto);

    expect(result.total).toBe(200);
    expect(result.status).toBe(OrderStatus.PENDING);
    expect(deps.stockService.reserveStock).toHaveBeenCalledTimes(1);
    expect(deps.orderRepository.createOrder).toHaveBeenCalledTimes(1);
    expect(deps.eventEmitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_CREATED,
      expect.objectContaining({ orderId: 'ORDER-1' }),
    );
  });

  it('usa el precio del catálogo, no el del cliente', async () => {
    const deps = makeDeps({
      productFinder: {
        findByIds: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Laptop',
            price: 999,
            stock: 10,
            status: 'ACTIVE',
          },
        ]),
      },
    });
    const useCase = makeUseCase(deps);

    const result = await useCase.execute(USER_ID, {
      ...validDto,
      items: [{ productId: 'prod-1', quantity: 1, price: 1 }],
    });

    expect(result.total).toBe(999);
  });

  // ─── Validaciones ──────────────────────────────────────────────
  it('lanza BadRequest si el producto no está en el catálogo', async () => {
    const deps = makeDeps({
      productFinder: { findByIds: jest.fn().mockResolvedValue([]) },
    });
    const useCase = makeUseCase(deps);

    await expect(useCase.execute(USER_ID, validDto)).rejects.toThrow(
      HttpException,
    );
    expect(deps.stockService.reserveStock).not.toHaveBeenCalled();
  });

  it('lanza BadRequest si el producto no está ACTIVE', async () => {
    const deps = makeDeps({
      productFinder: {
        findByIds: jest.fn().mockResolvedValue([
          {
            id: 'prod-1',
            name: 'Laptop',
            price: 100,
            stock: 10,
            status: 'INACTIVE',
          },
        ]),
      },
    });
    const useCase = makeUseCase(deps);

    await expect(useCase.execute(USER_ID, validDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ─── stock insuficiente ─────────────────────────────────────────
  it('lanza BadRequest si no hay stock suficiente', async () => {
    const deps = makeDeps({
      stockService: {
        reserveStock: jest
          .fn()
          .mockRejectedValue(new InsufficientStockException('prod-1')),
      },
    });
    const useCase = makeUseCase(deps);

    await expect(useCase.execute(USER_ID, validDto)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ─── Compensación ──────────────────────────────────────────────
  it('libera la reserva si falla createOrder', async () => {
    const deps = makeDeps({
      orderRepository: {
        findByIdempotencyKey: jest.fn().mockResolvedValue(null),
        createOrder: jest.fn().mockRejectedValue(new Error('DB down')),
      },
    });
    const useCase = makeUseCase(deps);

    await expect(useCase.execute(USER_ID, validDto)).rejects.toThrow(
      HttpException,
    );

    expect(deps.stockService.releaseReservation).toHaveBeenCalledWith('res-1');
  });
});
