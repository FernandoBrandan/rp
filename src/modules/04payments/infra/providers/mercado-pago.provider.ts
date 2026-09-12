import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@infra/logger/logger.interface';
import { LOGGER } from '@infra/tokens';
import {
  PaymentOrderSnapshot,
  PaymentProviderPort,
} from '../../application/ports/payment-provider.port';

@Injectable()
export class MercadoPagoProvider implements PaymentProviderPort {
  constructor(
    private readonly config: ConfigService,
    @Inject(LOGGER) private readonly logger: Logger,
  ) {}

  async generatePaymentLink(
    order: PaymentOrderSnapshot,
  ): Promise<{ url: string }> {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN is not configured');
    }

    this.logger.warn('MercadoPagoProvider is not implemented yet', {
      orderId: order.id,
    });

    throw new NotImplementedException(
      'MercadoPagoProvider.generatePaymentLink is not implemented',
    );

    // 1. Llamar a la API de MercadoPago (SDK o HTTP)
    // 2. Mapear respuesta → { url: string }
    // 3. Manejar errores de la API
    // 4. (Opcional) persistir el paymentId externo
  }
}
