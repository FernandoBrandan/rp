import { BadRequestException } from '@nestjs/common';

import { HandleWebhookUseCase } from '@payment/application/use-cases/handle-webhook.use-case';
import { EventNames } from '@common/events/event-names';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

describe('HandleWebhookUseCase', () => {
  it('emite ORDER_PAID cuando el status es approved', async () => {
    const emitter = { emit: jest.fn() };
    const useCase = new HandleWebhookUseCase(emitter as any, makeLogger());

    await useCase.execute({
      id: 'evt-1',
      status: 'approved',
      metadata: { orderId: 'ORDER-1' },
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_PAID,
      expect.objectContaining({ orderId: 'ORDER-1' }),
    );
  });

  it('acepta "succeeded" y "paid" como approved', async () => {
    const emitter = { emit: jest.fn() };
    const useCase = new HandleWebhookUseCase(emitter as any, makeLogger());

    await useCase.execute({
      id: 'evt-1',
      status: 'paid',
      metadata: { orderId: 'ORDER-1' },
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_PAID,
      expect.anything(),
    );
  });

  it('emite ORDER_PAYMENT_FAILED cuando el status es rejected', async () => {
    const emitter = { emit: jest.fn() };
    const useCase = new HandleWebhookUseCase(emitter as any, makeLogger());

    await useCase.execute({
      id: 'evt-1',
      status: 'rejected',
      metadata: { orderId: 'ORDER-1' },
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_PAYMENT_FAILED,
      expect.objectContaining({ orderId: 'ORDER-1' }),
    );
  });

  it('ignora statuses no terminales (pending)', async () => {
    const emitter = { emit: jest.fn() };
    const useCase = new HandleWebhookUseCase(emitter as any, makeLogger());

    await useCase.execute({
      id: 'evt-1',
      status: 'pending',
      metadata: { orderId: 'ORDER-1' },
    });

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('lanza BadRequest si falta orderId', async () => {
    const emitter = { emit: jest.fn() };
    const useCase = new HandleWebhookUseCase(emitter as any, makeLogger());

    await expect(
      useCase.execute({ id: 'evt-1', status: 'approved', metadata: {} as any }),
    ).rejects.toThrow(BadRequestException);
  });
});
