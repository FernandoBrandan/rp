import { CreatePaymentLinkUseCase } from '@payment/application/use-cases/create-payment-link.use-case';

const order = {
  id: 'ORDER-1',
  total: 200,
  items: [{ productId: 'p', quantity: 1 }],
  status: 'PENDING',
};

describe('CreatePaymentLinkUseCase', () => {
  it('devuelve la URL del provider', async () => {
    const provider = {
      generatePaymentLink: jest.fn().mockResolvedValue({ url: 'http://pay/1' }),
    };
    const useCase = new CreatePaymentLinkUseCase(provider);

    const url = await useCase.execute(order);

    expect(url).toBe('http://pay/1');
    expect(provider.generatePaymentLink).toHaveBeenCalledWith(order);
  });

  it('lanza error si el provider devuelve URL vacía', async () => {
    const provider = {
      generatePaymentLink: jest.fn().mockResolvedValue({ url: '' }),
    };
    const useCase = new CreatePaymentLinkUseCase(provider);

    await expect(useCase.execute(order)).rejects.toThrow(
      'Payment provider returned an empty URL',
    );
  });

  it('propaga el error del provider', async () => {
    const provider = {
      generatePaymentLink: jest.fn().mockRejectedValue(new Error('timeout')),
    };
    const useCase = new CreatePaymentLinkUseCase(provider);

    await expect(useCase.execute(order)).rejects.toThrow('timeout');
  });
});
