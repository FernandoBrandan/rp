import { FakePaymentProvider } from '@payment/infra/providers/fake-payment.provider';
import { EventNames } from '@common/events/event-names';

function makeLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
}

function makeConfig(outcome: string, delayMs: number) {
  return {
    get: jest.fn((key: string, def?: any) => {
      if (key === 'FAKE_PAYMENT_OUTCOME') return outcome;
      if (key === 'FAKE_PAYMENT_DELAY_MS') return String(delayMs);
      return def;
    }),
  };
}

const order = {
  id: 'ORDER-1',
  total: 200,
  items: [{ productId: 'p', quantity: 1 }],
  status: 'PENDING',
};

describe('FakePaymentProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('devuelve una URL con el orderId', async () => {
    const emitter = { emit: jest.fn() };
    const provider = new FakePaymentProvider(
      emitter as any,
      makeConfig('approved', 1000) as any,
      makeLogger(),
    );

    const result = await provider.generatePaymentLink(order);

    expect(result.url).toContain('ORDER-1');
  });

  it('con outcome=approved emite ORDER_PAID después del delay', async () => {
    const emitter = { emit: jest.fn() };
    const provider = new FakePaymentProvider(
      emitter as any,
      makeConfig('approved', 1000) as any,
      makeLogger(),
    );

    await provider.generatePaymentLink(order);

    // antes del delay: no emitió
    expect(emitter.emit).not.toHaveBeenCalled();

    // avanzamos el reloj
    jest.advanceTimersByTime(1000);

    expect(emitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_PAID,
      expect.objectContaining({ orderId: 'ORDER-1' }),
    );
  });

  it('con outcome=failed emite ORDER_PAYMENT_FAILED', async () => {
    const emitter = { emit: jest.fn() };
    const provider = new FakePaymentProvider(
      emitter as any,
      makeConfig('failed', 1000) as any,
      makeLogger(),
    );

    await provider.generatePaymentLink(order);
    jest.advanceTimersByTime(1000);

    expect(emitter.emit).toHaveBeenCalledWith(
      EventNames.ORDER_PAYMENT_FAILED,
      expect.objectContaining({ orderId: 'ORDER-1' }),
    );
  });

  it('con outcome=pending no emite nada', async () => {
    const emitter = { emit: jest.fn() };
    const provider = new FakePaymentProvider(
      emitter as any,
      makeConfig('pending', 1000) as any,
      makeLogger(),
    );

    await provider.generatePaymentLink(order);
    jest.advanceTimersByTime(10_000);

    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
